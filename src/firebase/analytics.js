/**
 * Privacy-safe analytics: OFF unless a measurement ID is configured AND the user
 * opts in (Settings → Privacy). Only coarse event names are sent — never memory
 * titles, content, code, or search text.
 */
import { firebaseConfig, isFirebaseConfigured } from '../config/firebase.js';
import { getPref } from '../utils/prefs.js';

let analytics = null;
let logEventFn = null;

export async function initAnalytics() {
  if (analytics || !isFirebaseConfigured || !firebaseConfig.measurementId || !getPref('analyticsOptIn')) return;
  try {
    const [mod, { getFirebaseApp }] = await Promise.all([import('firebase/analytics'), import('./config.js')]);
    if (!(await mod.isSupported())) return;
    analytics = mod.initializeAnalytics(getFirebaseApp(), { config: { anonymize_ip: true, send_page_view: false } });
    logEventFn = mod.logEvent;
  } catch { /* blocked by an ad blocker, etc. */ }
}

const ALLOWED = new Set(['memory_created', 'review_completed', 'search_used', 'backup_exported', 'quick_capture_used', 'sign_up', 'login']);

export function track(event, params = {}) {
  if (!analytics || !logEventFn || !ALLOWED.has(event)) return;
  const safe = {};
  for (const [k, v] of Object.entries(params)) if (typeof v === 'number' || ['type', 'method'].includes(k)) safe[k] = v;
  try { logEventFn(analytics, event, safe); } catch { /* ignore */ }
}
