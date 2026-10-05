/**
 * Review reminders. There's no server push in the MVP: when DevMemory is open
 * (or starts) and memories are due, it shows one browser notification per day
 * — only if the user enabled reminders and granted permission.
 */
import { dataStore } from '../state/dataStore.js';
import { authState } from '../state/authState.js';
import { dueQueue } from '../utils/spacedRepetition.js';
import { getPref, setPref } from '../utils/prefs.js';
import { isoDate } from '../utils/date.js';

export function notificationsSupported() { return typeof Notification !== 'undefined'; }

export async function requestPermission() {
  if (!notificationsSupported()) return 'unsupported';
  return Notification.requestPermission();
}

export function startReminders() {
  return dataStore.subscribe((d) => {
    const { mode, settings } = authState.get();
    if (mode !== 'user' || !d.loaded.memories || settings?.reviewReminders === false) return;
    if (!notificationsSupported() || Notification.permission !== 'granted') return;
    if (getPref('lastReminder') === isoDate()) return;
    const due = dueQueue(d.memories).length;
    if (!due) return;
    setPref('lastReminder', isoDate());
    try {
      const n = new Notification('DevMemory', { body: `${due} memor${due === 1 ? 'y is' : 'ies are'} ready for review.`, tag: 'devmemory-review' });
      n.onclick = () => { window.focus(); location.hash = '#/review'; n.close(); };
    } catch { /* some browsers only allow notifications from a service worker */ }
  });
}
