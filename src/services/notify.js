/** Bridges services and the toast UI; central error reporting. */
import { toast } from '../components/toast.js';
import { humanizeError, logError } from '../utils/errors.js';
import { markOfflineWrite } from '../state/dataStore.js';

export function reportError(err, context = '') {
  logError(err, context);
  if (err?.code === 'demo/read-only') {
    toast(humanizeError(err), {
      type: 'info',
      action: { label: 'Create account', onClick: () => { location.hash = '#/register'; } },
      duration: 6000,
    });
    return;
  }
  toast(humanizeError(err), { type: 'error' });
}

/** Run an async UI action with consistent error handling. */
export async function runAction(fn, context = '') {
  try { return await fn(); } catch (err) { reportError(err, context); return undefined; }
}

/** Track a repository write: surface server rejections; note offline queueing. */
export function trackCommit(result, context = 'write') {
  if (!result) return result;
  if (navigator.onLine === false) markOfflineWrite();
  result.committed?.catch((err) => reportError(err, context));
  return result;
}

export function notifySaved(label = 'Saved') {
  if (navigator.onLine === false) {
    toast('Saved locally — will sync when you’re online.', { type: 'offline' });
  } else {
    toast(`${label} ✓`, { type: 'success' });
  }
}

export { toast };
