/** Human-readable error messages. Raw Firebase errors stay in the console (dev only). */
export class DemoWriteError extends Error {
  constructor() { super('Create an account to save your memories.'); this.code = 'demo/read-only'; }
}

const MESSAGES = {
  'demo/read-only': 'Create an account to save your memories.',
  'app/not-configured': 'Cloud sync isn’t configured for this deployment yet. You can still explore the demo.',
  'auth/invalid-credential': 'That email and password don’t match an account.',
  'auth/invalid-login-credentials': 'That email and password don’t match an account.',
  'auth/wrong-password': 'That email and password don’t match an account.',
  'auth/user-not-found': 'No account uses that email. Create one instead?',
  'auth/invalid-email': 'Enter a valid email address.',
  'auth/email-already-in-use': 'An account already uses that email. Sign in instead.',
  'auth/weak-password': 'Use at least 8 characters for your password.',
  'auth/missing-password': 'Enter your password.',
  'auth/popup-closed-by-user': 'Sign-in window closed before finishing.',
  'auth/cancelled-popup-request': 'Sign-in was cancelled.',
  'auth/popup-blocked': 'Your browser blocked the sign-in window. Allow pop-ups and try again.',
  'auth/network-request-failed': 'Can’t reach the sign-in service. Check your connection.',
  'auth/too-many-requests': 'Too many attempts. Wait a minute, then try again.',
  'auth/requires-recent-login': 'For your security, sign in again to continue.',
  'auth/unauthorized-domain': 'This domain isn’t authorised for sign-in. Add it under Firebase Console → Authentication → Settings → Authorized domains.',
  'auth/operation-not-allowed': 'This sign-in method isn’t enabled in Firebase Console yet.',
  'auth/user-disabled': 'This account has been disabled.',
  'auth/account-exists-with-different-credential': 'An account with this email already exists. Sign in with the method you used before.',
  'auth/user-token-expired': 'Your session expired. Sign in again.',
  'auth/invalid-user-token': 'Your session expired. Sign in again.',
  'permission-denied': 'You don’t have permission to do that. Try signing out and back in.',
  'unauthenticated': 'Your session expired. Sign in again.',
  'unavailable': 'Can’t reach the server. Your changes are saved locally and will sync later.',
  'resource-exhausted': 'The service quota was reached. Try again later.',
  'invalid-argument': 'Some of that data isn’t valid. Check the fields and try again.',
  'failed-precondition': 'Offline storage is limited in this tab. Close other DevMemory tabs and reload.',
  'deadline-exceeded': 'The request took too long. Try again.',
  'not-found': 'That item no longer exists.',
  'storage/unauthorized': 'You don’t have permission to access that file.',
  'storage/quota-exceeded': 'Storage quota reached. Delete old attachments or try later.',
  'storage/canceled': 'Upload cancelled.',
  'storage/retry-limit-exceeded': 'Upload failed after several tries. Check your connection.',
  'storage/unknown': 'Upload failed. Try again.',
  'upload/offline': 'Attachments need a connection. Text is saved; add images when you’re online.',
  'upload/too-large': 'Images must be under 5 MB.',
  'upload/type': 'Only PNG, JPEG, GIF and WebP images can be attached.',
  'import/invalid': 'That file isn’t a DevMemory backup.',
};

export function humanizeError(err) {
  if (!err) return 'Something went wrong.';
  const code = err.code || err.name;
  if (code && MESSAGES[code]) return MESSAGES[code];
  if (typeof code === 'string' && code.startsWith('firestore/')) {
    const short = code.replace('firestore/', '');
    if (MESSAGES[short]) return MESSAGES[short];
  }
  if (err.message === 'FIREBASE_NOT_CONFIGURED') return MESSAGES['app/not-configured'];
  return 'Something went wrong. Try again.';
}

export function codedError(code, message) {
  const e = new Error(message || MESSAGES[code] || code);
  e.code = code;
  return e;
}

export function logError(err, context = '') {
  if (import.meta.env?.DEV) console.error(`[DevMemory]${context ? ` ${context}:` : ''}`, err);
}
