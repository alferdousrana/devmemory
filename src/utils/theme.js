import { getPref, setPref } from './prefs.js';

const media = window.matchMedia?.('(prefers-color-scheme: light)');

export function resolvedTheme(pref = getPref('theme')) {
  if (pref === 'system') return media?.matches ? 'light' : 'dark';
  return pref === 'light' ? 'light' : 'dark';
}

export function applyTheme(pref = getPref('theme')) {
  const t = resolvedTheme(pref);
  document.documentElement.dataset.theme = t;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t === 'light' ? '#f4f6f9' : '#161a22');
}

export function setTheme(pref) {
  setPref('theme', pref);
  applyTheme(pref);
}

export function toggleTheme() {
  const next = resolvedTheme() === 'dark' ? 'light' : 'dark';
  setTheme(next);
  return next;
}

media?.addEventListener?.('change', () => { if (getPref('theme') === 'system') applyTheme('system'); });
