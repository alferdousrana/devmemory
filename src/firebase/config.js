/** Centralised Firebase App initialisation (modular SDK, initialised once, lazily). */
import { initializeApp, getApps } from 'firebase/app';
import { firebaseConfig, isFirebaseConfigured, appCheckSiteKey } from '../config/firebase.js';

let app = null;
let appCheckStarted = false;

export function getFirebaseApp() {
  if (!isFirebaseConfigured) {
    const e = new Error('FIREBASE_NOT_CONFIGURED');
    e.code = 'app/not-configured';
    throw e;
  }
  if (!app) app = getApps()[0] || initializeApp(firebaseConfig);
  return app;
}

/** App Check (optional). Loaded only when a reCAPTCHA v3 site key is configured. */
export async function initAppCheck() {
  if (!appCheckSiteKey || appCheckStarted) return;
  appCheckStarted = true;
  try {
    const { initializeAppCheck, ReCaptchaV3Provider } = await import('firebase/app-check');
    initializeAppCheck(getFirebaseApp(), {
      provider: new ReCaptchaV3Provider(appCheckSiteKey),
      isTokenAutoRefreshEnabled: true,
    });
  } catch (err) {
    if (import.meta.env.DEV) console.warn('[DevMemory] App Check failed to start', err);
  }
}
