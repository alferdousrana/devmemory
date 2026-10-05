/**
 * Authentication + session orchestration.
 * Firebase Auth state → service context → live data sync → profile.
 * Demo mode uses in-memory read-only repositories and never touches Firebase.
 */
import { authState } from '../state/authState.js';
import { startDataSync, stopDataSync } from '../state/dataStore.js';
import { setContext, getContext } from './context.js';
import { createFirestoreRepositories, createDemoRepositories } from '../repositories/index.js';
import { isFirebaseConfigured } from '../config/firebase.js';
import { sanitize } from '../data/schema.js';
import { getPref } from '../utils/prefs.js';
import { codedError, logError } from '../utils/errors.js';
import { track } from '../firebase/analytics.js';

let authMod = null;
let profileUnsub = null;
let settingsUnsub = null;

async function auth() {
  if (!isFirebaseConfigured) throw codedError('app/not-configured');
  if (!authMod) authMod = await import('../firebase/auth.js');
  return authMod;
}

function serializeUser(u) {
  return {
    uid: u.uid, displayName: u.displayName || '', email: u.email || '', photoURL: u.photoURL || '',
    providerIds: (u.providerData || []).map((p) => p.providerId), emailVerified: !!u.emailVerified,
    createdAt: u.metadata?.creationTime ? Date.parse(u.metadata.creationTime) : null,
  };
}

function defaultProfile(user) {
  return sanitize('users', {
    uid: user.uid,
    displayName: user.displayName || (user.email || '').split('@')[0] || 'Developer',
    email: user.email || '',
    photoURL: user.photoURL || '',
    onboardingCompleted: false,
    primaryTechnologies: [],
    currentProjects: [],
    theme: getPref('theme') || 'dark',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || '',
    streak: 0,
    longestStreak: 0,
    lastActiveAt: null,
  }, { partial: true });
}

/** Load users/{uid}; create it on first sign-in. Works offline from cache when possible. */
async function ensureProfile(user, repos) {
  try {
    const existing = await repos.users.get(user.uid);
    if (existing) return existing;
    const profile = defaultProfile(user);
    repos.users.create(user.uid, profile).committed.catch((e) => logError(e, 'create profile'));
    track('sign_up');
    return { ...profile, createdAt: Date.now() };
  } catch (err) {
    // Offline with no cached profile: run with a provisional one; the listener fixes it up later.
    logError(err, 'load profile');
    return { ...defaultProfile(user), onboardingCompleted: true, provisional: true };
  }
}

function clearSubscriptions() {
  profileUnsub?.(); settingsUnsub?.();
  profileUnsub = null; settingsUnsub = null;
}

async function enterUser(user) {
  clearSubscriptions();
  const repos = await createFirestoreRepositories();
  setContext({ uid: user.uid, repos, mode: 'user' });
  authState.set({ currentUser: serializeUser(user), isAuthenticated: true, mode: 'user', loading: true });
  const profile = await ensureProfile(user, repos);
  authState.set({ profile, loading: false });
  profileUnsub = repos.users.subscribe(user.uid, (p) => { if (p) authState.set({ profile: p }); }, (e) => logError(e, 'profile listener'));
  settingsUnsub = repos.users.subscribeSettings(user.uid, (s) => authState.set({ settings: s }), (e) => logError(e, 'settings listener'));
  startDataSync(user.uid, repos, { demo: false });
  import('../firebase/analytics.js').then((m) => m.initAnalytics()).catch(() => {});
}

function enterGuest() {
  clearSubscriptions();
  stopDataSync();
  setContext({ uid: null, repos: null, mode: 'guest' });
  authState.set({ currentUser: null, isAuthenticated: false, mode: 'guest', profile: null, settings: null, loading: false });
}

export const authService = {
  async init() {
    if (!isFirebaseConfigured) {
      authState.set({ authReady: true, loading: false });
      return;
    }
    try {
      const { initAppCheck } = await import('../firebase/config.js');
      initAppCheck();
      const a = await auth();
      a.completeRedirectSignIn();
      a.onAuthChange(async (user) => {
        try {
          if (user) await enterUser(user);
          else if (getContext().mode !== 'demo') enterGuest();
        } catch (err) {
          logError(err, 'auth change');
          if (!user) enterGuest();
        } finally {
          authState.set({ authReady: true, loading: false });
          window.dispatchEvent(new CustomEvent('devmemory:auth-changed'));
        }
      });
    } catch (err) {
      logError(err, 'auth init');
      authState.set({ authReady: true, loading: false });
    }
  },

  async signInWithGoogle() { const a = await auth(); const u = await a.signInWithGoogle(); track('login', { method: 'google' }); return u; },
  async signInWithEmail(email, password) { const a = await auth(); const u = await a.signInWithEmail(email.trim(), password); track('login', { method: 'password' }); return u; },
  async register({ name, email, password }) {
    if (String(password).length < 8) throw codedError('auth/weak-password');
    const a = await auth();
    return a.registerWithEmail(email.trim(), password, name?.trim());
  },
  async resetPassword(email) { const a = await auth(); return a.sendReset(email.trim()); },

  async signOut() {
    if (getContext().mode === 'demo') { this.exitDemo(); return; }
    clearSubscriptions();
    stopDataSync(); // detach listeners before the token goes away (avoids permission errors)
    const a = await auth();
    await a.signOutUser();
  },

  async enterDemo() {
    if (getContext().mode === 'user') return;
    const repos = await createDemoRepositories();
    const profile = await repos.users.get();
    setContext({ uid: 'demo', repos, mode: 'demo' });
    authState.set({
      mode: 'demo', isAuthenticated: false, profile, settings: null,
      currentUser: { uid: 'demo', displayName: profile.displayName, email: '', photoURL: '', providerIds: [] },
      authReady: true, loading: false,
    });
    startDataSync('demo', repos, { demo: true });
  },

  exitDemo() { enterGuest(); },

  providerIds() { return authState.get().currentUser?.providerIds || []; },

  /**
   * Delete account: re-authenticate first (Firebase requires a recent login),
   * then delete Firestore data + Storage files, then the Auth user.
   */
  async deleteAccount({ password } = {}) {
    const ctx = getContext();
    if (ctx.mode !== 'user') throw codedError('demo/read-only');
    const a = await auth();
    await a.reauthenticate({ password });
    const { backupService } = await import('./backupService.js');
    clearSubscriptions();
    stopDataSync();
    await backupService.deleteAllData();
    await ctx.repos.users.deleteProfile(ctx.uid);
    await a.deleteCurrentUser();
    const { clearLocalCache } = await import('../firebase/firestore.js');
    await clearLocalCache();
    enterGuest();
  },
};
