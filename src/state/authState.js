/**
 * Centralised authentication state.
 *   currentUser      — { uid, displayName, email, photoURL, providerIds } or null
 *   isAuthenticated  — signed in with a real account
 *   loading          — auth is resolving
 *   authReady        — first auth state has been determined
 *   mode             — 'guest' | 'user' | 'demo'
 *   profile          — users/{uid} document (or demo profile)
 *   settings         — users/{uid}/settings/profile
 */
import { createStore } from './store.js';

export const authState = createStore({
  currentUser: null,
  isAuthenticated: false,
  loading: true,
  authReady: false,
  mode: 'guest',
  profile: null,
  settings: null,
});

export function waitForAuthReady() {
  if (authState.get().authReady) return Promise.resolve(authState.get());
  return new Promise((resolve) => {
    const unsub = authState.subscribe((s) => { if (s.authReady) { unsub(); resolve(s); } });
  });
}

export const isAppMode = () => ['user', 'demo'].includes(authState.get().mode);
