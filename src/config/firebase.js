/**
 * Firebase web configuration, read from Vite environment variables (.env).
 *
 * IMPORTANT: these values are public identifiers, not secrets. Every Firebase
 * web app sends them to the browser. What protects user data is:
 *   • Firebase Authentication (who you are)
 *   • firestore.rules / storage.rules (what you may read and write)
 *   • optionally App Check (that requests come from this app)
 * Never put service-account keys or the Admin SDK in this frontend.
 */
const env = import.meta.env;

export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || undefined,
};

export const appCheckSiteKey = env.VITE_FIREBASE_APPCHECK_SITE_KEY || '';
export const useEmulators = env.VITE_USE_FIREBASE_EMULATORS === 'true';

/** True when enough config is present to talk to Firebase. Otherwise the app runs demo-only. */
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId && firebaseConfig.appId,
);
export const isStorageConfigured = isFirebaseConfigured && Boolean(firebaseConfig.storageBucket);
