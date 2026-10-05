/**
 * DevMemory entry point.
 * Boot order: theme → styles → auth (lazy Firebase) → router → shortcuts.
 */
import '@fontsource/ibm-plex-sans/latin-400.css';
import '@fontsource/ibm-plex-sans/latin-500.css';
import '@fontsource/ibm-plex-sans/latin-600.css';
import '@fontsource/ibm-plex-mono/latin-400.css';
import '@fontsource/ibm-plex-mono/latin-500.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/layout.css';
import './styles/components.css';
import './styles/pages.css';

import { applyTheme, toggleTheme } from './utils/theme.js';
import { authState, isAppMode } from './state/authState.js';
import { createRouter, navigate } from './router.js';
import { mountShell } from './components/appShell.js';
import { authService } from './services/authService.js';
import { reportError, runAction, toast } from './services/notify.js';
import { copyText } from './utils/files.js';
import { isTypingTarget } from './utils/dom.js';
import { logError } from './utils/errors.js';

applyTheme();

const root = document.getElementById('app');
let shell = null;

const lazyCapture = () => import('./components/quickCapture.js');
const lazyPalette = () => import('./components/commandPalette.js');

function openCapture(opts) {
  if (!isAppMode()) { toast('Sign in or open the demo to capture memories.', { type: 'info' }); return; }
  lazyCapture().then((m) => m.openQuickCapture(opts)).catch((e) => reportError(e));
}

async function signOut() {
  await runAction(async () => {
    const wasDemo = authState.get().mode === 'demo';
    await authService.signOut();
    navigate('/');
    toast(wasDemo ? 'Left the demo' : 'Signed out', { type: 'info' });
  }, 'sign out');
}

function paletteActions() {
  const go = (p) => () => navigate(p);
  return [
    { label: 'Quick capture', icon: 'zap', run: () => openCapture(), shortcut: ['Mod', '⇧', 'M'], keywords: 'new add save capture' },
    { label: 'Search everything', icon: 'search', run: go('/search'), keywords: 'find' },
    { label: 'New memory', icon: 'brain', run: go('/memories/new'), keywords: 'add create' },
    { label: 'New bug', icon: 'bug', run: go('/memories/new?type=BUG'), keywords: 'error add create' },
    { label: 'New snippet', icon: 'code', run: go('/snippets?new=1'), keywords: 'add create code' },
    { label: 'New command', icon: 'terminal', run: go('/commands?new=1'), keywords: 'add create cli' },
    { label: 'New project', icon: 'folder', run: go('/projects?new=1'), keywords: 'add create' },
    { label: 'Start review', icon: 'repeat', run: go('/review'), keywords: 'study spaced repetition' },
    { label: 'Export backup', icon: 'download', run: () => runAction(async () => { const { backupService } = await import('./services/backupService.js'); await backupService.exportJSON(); toast('Backup exported ✓', { type: 'success' }); }), keywords: 'json download data' },
    { label: 'Settings', icon: 'sliders', run: go('/settings'), keywords: 'preferences' },
    { label: 'Toggle theme', icon: 'moon', run: () => { const t = toggleTheme(); toast(`${t === 'dark' ? 'Dark' : 'Light'} theme`); }, keywords: 'dark light' },
    { label: 'Go to dashboard', icon: 'home', run: go('/dashboard') },
    { label: 'Go to errors & fixes', icon: 'bug', run: go('/errors') },
    { label: 'Go to snippets', icon: 'code', run: go('/snippets') },
    { label: 'Go to commands', icon: 'terminal', run: go('/commands') },
    { label: 'Go to projects', icon: 'folder', run: go('/projects') },
    { label: 'Go to bookmarks', icon: 'bookmark', run: go('/bookmarks') },
    { label: 'Go to collections', icon: 'layers', run: go('/collections') },
    { label: 'Go to favorites', icon: 'star', run: go('/favorites') },
    { label: 'Go to insights', icon: 'chart', run: go('/insights') },
    { label: 'Open memory graph', icon: 'graph', run: go('/graph') },
    { label: 'Open developer journey', icon: 'timeline', run: go('/journey') },
    { label: authState.get().mode === 'demo' ? 'Exit demo' : 'Sign out', icon: 'logout', run: signOut, keywords: 'logout log out' },
  ];
}

function openPalette(initialQuery = '') {
  if (!isAppMode()) return;
  lazyPalette().then((m) => m.openCommandPalette({ actions: paletteActions(), initialQuery })).catch((e) => reportError(e));
}

function ensureShell() {
  if (!shell) {
    shell = mountShell(root, {
      onCapture: () => openCapture(),
      onPalette: () => openPalette(),
      onSignOut: signOut,
      onToggleTheme: toggleTheme,
      onExitDemo: () => { authService.exitDemo(); navigate('/'); },
    });
  }
  return shell;
}
function removeShell() { if (shell) { shell.destroy(); shell = null; } root.innerHTML = ''; }

const router = createRouter({ root, ensureShell, removeShell, enterDemo: () => authService.enterDemo() });

// ---- global keyboard shortcuts -------------------------------------------
document.addEventListener('keydown', (e) => {
  const mod = e.metaKey || e.ctrlKey;
  if (mod && e.shiftKey && e.code === 'KeyM') { e.preventDefault(); openCapture(); return; }
  if (mod && e.shiftKey && e.code === 'KeyP') { e.preventDefault(); openPalette(); return; }
  if (mod && !e.shiftKey && e.code === 'KeyK') { e.preventDefault(); openPalette(); return; }
  if (document.body.classList.contains('has-modal') || isTypingTarget(e.target) || mod || e.altKey) return;
  if (e.key === '/') { e.preventDefault(); openPalette(); }
  else if (e.key === 'c' && isAppMode()) { e.preventDefault(); openCapture(); }
});

// ---- global delegated actions ---------------------------------------------
document.addEventListener('click', async (e) => {
  const copyBtn = e.target.closest('[data-copy], [data-copy-code]');
  if (copyBtn && copyBtn.dataset.text != null && !copyBtn.dataset.copyCommand && !copyBtn.dataset.copySnippet) {
    const ok = await copyText(copyBtn.dataset.text);
    toast(ok ? 'Copied ✓' : 'Couldn’t copy — select the text manually', { type: ok ? 'success' : 'error' });
    return;
  }
  if (e.target.closest('[data-action="reload"]')) location.reload();
});

window.addEventListener('devmemory:synced', () => toast('Synced ✓', { type: 'success' }));
window.addEventListener('devmemory:auth-changed', () => router.resolve());
window.addEventListener('devmemory:data-error', (e) => reportError(e.detail?.err, `listener ${e.detail?.name}`));
window.addEventListener('unhandledrejection', (e) => { logError(e.reason, 'unhandled rejection'); });
window.addEventListener('offline', () => toast('You’re offline. Keep working — changes will sync later.', { type: 'offline' }));

// ---- boot -------------------------------------------------------------------
authService.init();
import('./services/reminderService.js').then((m) => m.startReminders()).catch(() => {});
router.resolve();

// ---- PWA service worker (production only) -----------------------------------
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch((err) => logError(err, 'service worker'));
  });
}
