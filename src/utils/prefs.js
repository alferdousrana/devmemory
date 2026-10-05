/**
 * Small UI preferences only (theme, dashboard mode, recent searches, consents).
 * User data is NEVER stored here — Firestore's offline cache handles that.
 */
const KEY = 'devmemory:prefs';
const DEFAULTS = {
  theme: 'dark',
  dashboardMode: 'overview',
  recentSearches: [],
  searchTopicCounts: {},
  analyticsOptIn: false,
  sidebarCollapsed: false,
  listView: 'list',
};

let cache = null;
function load() {
  if (cache) return cache;
  try { cache = { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; }
  catch { cache = { ...DEFAULTS }; }
  return cache;
}
export function getPref(key) { return load()[key]; }
export function setPref(key, value) {
  load()[key] = value;
  try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch { /* storage full or blocked */ }
}
export function clearPrefs() { cache = { ...DEFAULTS }; try { localStorage.removeItem(KEY); } catch { /* ignore */ } }

export function rememberSearch(query, topics = []) {
  const q = String(query || '').trim();
  if (q.length < 2) return;
  const recent = [q, ...getPref('recentSearches').filter((x) => x !== q)].slice(0, 8);
  setPref('recentSearches', recent);
  const counts = { ...getPref('searchTopicCounts') };
  for (const t of topics.slice(0, 5)) counts[t] = (counts[t] || 0) + 1;
  // keep it small
  const trimmed = Object.fromEntries(Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 50));
  setPref('searchTopicCounts', trimmed);
}
