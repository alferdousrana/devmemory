export const DAY = 86400000;

export function startOfDay(ts = Date.now()) {
  const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime();
}
export function dayKey(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function isToday(ts) { return ts && startOfDay(ts) === startOfDay(); }
export function isYesterday(ts) { return ts && startOfDay(ts) === startOfDay() - DAY; }

export function timeOfDay(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}
export function formatDate(ts, opts = { month: 'short', day: 'numeric', year: 'numeric' }) {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString(undefined, opts);
}
export function dayLabel(ts) {
  if (isToday(ts)) return 'Today';
  if (isYesterday(ts)) return 'Yesterday';
  return formatDate(ts, { weekday: 'long', month: 'short', day: 'numeric' });
}
export function relativeTime(ts, now = Date.now()) {
  if (!ts) return 'never';
  const diff = ts - now;
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  if (abs < 60000) return 'just now';
  if (abs < 3600000) return rtf.format(Math.round(diff / 60000), 'minute');
  if (abs < DAY) return rtf.format(Math.round(diff / 3600000), 'hour');
  if (abs < 30 * DAY) return rtf.format(Math.round(diff / DAY), 'day');
  if (abs < 365 * DAY) return rtf.format(Math.round(diff / (30 * DAY)), 'month');
  return rtf.format(Math.round(diff / (365 * DAY)), 'year');
}
export function greeting(date = new Date()) {
  const h = date.getHours();
  if (h < 5) return 'Working late';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}
export function isoDate(date = new Date()) { return dayKey(date.getTime()); }
export function monthKey(ts) { const d = new Date(ts); return `${d.getFullYear()}-${d.getMonth()}`; }
export function monthName(ts = Date.now()) { return new Date(ts).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }); }
