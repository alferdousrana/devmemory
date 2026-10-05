/** Firebase Authentication — the only module that imports firebase/auth. */
import {
  getAuth, connectAuthEmulator, GoogleAuthProvider, signInWithPopup, signInWithRedirect,
  getRedirectResult, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  sendPasswordResetEmail, signOut, onAuthStateChanged, updateProfile, deleteUser,
  reauthenticateWithPopup, reauthenticateWithCredential, EmailAuthProvider,
  setPersistence, browserLocalPersistence,
} from 'firebase/auth';
import { getFirebaseApp } from './config.js';
import { useEmulators } from '../config/firebase.js';

let auth = null;

export function getAuthInstance() {
  if (!auth) {
    auth = getAuth(getFirebaseApp());
    if (useEmulators) connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    setPersistence(auth, browserLocalPersistence).catch(() => {});
  }
  return auth;
}

const googleProvider = () => {
  const p = new GoogleAuthProvider();
  p.setCustomParameters({ prompt: 'select_account' });
  return p;
};

export async function signInWithGoogle() {
  const a = getAuthInstance();
  try {
    return (await signInWithPopup(a, googleProvider())).user;
  } catch (err) {
    // Popups can be blocked (some mobile browsers) — fall back to a full-page redirect.
    if (err?.code === 'auth/popup-blocked' || err?.code === 'auth/operation-not-supported-in-this-environment') {
      await signInWithRedirect(a, googleProvider());
      return null;
    }
    throw err;
  }
}

export async function completeRedirectSignIn() {
  try { return (await getRedirectResult(getAuthInstance()))?.user || null; } catch { return null; }
}

export async function signInWithEmail(email, password) {
  return (await signInWithEmailAndPassword(getAuthInstance(), email, password)).user;
}

export async function registerWithEmail(email, password, displayName) {
  const cred = await createUserWithEmailAndPassword(getAuthInstance(), email, password);
  if (displayName) await updateProfile(cred.user, { displayName });
  return cred.user;
}

export function sendReset(email) {
  return sendPasswordResetEmail(getAuthInstance(), email);
}

export function signOutUser() { return signOut(getAuthInstance()); }

export function onAuthChange(callback) { return onAuthStateChanged(getAuthInstance(), callback); }

export function updateDisplayName(name) {
  const u = getAuthInstance().currentUser;
  return u ? updateProfile(u, { displayName: name }) : Promise.resolve();
}

export function currentProviderIds() {
  return (getAuthInstance().currentUser?.providerData || []).map((p) => p.providerId);
}

/** Re-authenticate before sensitive operations (account deletion). */
export async function reauthenticate({ password } = {}) {
  const user = getAuthInstance().currentUser;
  if (!user) throw Object.assign(new Error('Not signed in'), { code: 'unauthenticated' });
  if (currentProviderIds().includes('password') && password) {
    const cred = EmailAuthProvider.credential(user.email, password);
    return reauthenticateWithCredential(user, cred);
  }
  return reauthenticateWithPopup(user, googleProvider());
}

export function deleteCurrentUser() {
  const user = getAuthInstance().currentUser;
  return user ? deleteUser(user) : Promise.resolve();
}
