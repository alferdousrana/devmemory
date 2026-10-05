/**
 * Hash router (works on GitHub Pages and Firebase Hosting without rewrites).
 * Routes lazy-load their page module, so each page is its own chunk.
 */
import { authState, waitForAuthReady, isAppMode } from './state/authState.js';
import { html, render } from './utils/html.js';
import { skeletonList } from './components/ui.js';
import { logError } from './utils/errors.js';

const routes = [
  { path: '/', load: () => import('./pages/landing.js'), title: 'DevMemory — your developer brain, searchable', public: true, shell: false },
  { path: '/login', load: () => import('./pages/auth.js'), title: 'Sign in', public: true, shell: false, authPage: true, props: { view: 'login' } },
  { path: '/register', load: () => import('./pages/auth.js'), title: 'Create account', public: true, shell: false, authPage: true, props: { view: 'register' } },
  { path: '/forgot', load: () => import('./pages/auth.js'), title: 'Reset password', public: true, shell: false, authPage: true, props: { view: 'forgot' } },
  { path: '/privacy', load: () => import('./pages/privacy.js'), title: 'Privacy', public: true, shell: 'auto' },
  { path: '/demo', demo: true, public: true },
  { path: '/onboarding', load: () => import('./pages/onboarding.js'), title: 'Welcome', shell: false, userOnly: true },
  { path: '/dashboard', load: () => import('./pages/dashboard.js'), title: 'Dashboard', nav: 'dashboard' },
  { path: '/capture', load: () => import('./pages/dashboard.js'), title: 'Dashboard', nav: 'dashboard', props: { capture: true } },
  { path: '/memories', load: () => import('./pages/memories.js'), title: 'Memories', nav: 'memories' },
  { path: '/memories/new', load: () => import('./pages/memoryEdit.js'), title: 'New memory', nav: 'memories' },
  { path: '/memories/:id', load: () => import('./pages/memoryDetail.js'), title: 'Memory', nav: 'memories' },
  { path: '/memories/:id/edit', load: () => import('./pages/memoryEdit.js'), title: 'Edit memory', nav: 'memories' },
  { path: '/errors', load: () => import('./pages/errors.js'), title: 'Errors & fixes', nav: 'errors' },
  { path: '/snippets', load: () => import('./pages/snippets.js'), title: 'Snippets', nav: 'snippets' },
  { path: '/commands', load: () => import('./pages/commands.js'), title: 'Commands', nav: 'commands' },
  { path: '/projects', load: () => import('./pages/projects.js'), title: 'Projects', nav: 'projects' },
  { path: '/projects/:id', load: () => import('./pages/projectDetail.js'), title: 'Project', nav: 'projects' },
  { path: '/bookmarks', load: () => import('./pages/bookmarks.js'), title: 'Bookmarks', nav: 'bookmarks' },
  { path: '/collections', load: () => import('./pages/collections.js'), title: 'Collections', nav: 'collections' },
  { path: '/collections/:id', load: () => import('./pages/collections.js'), title: 'Collection', nav: 'collections' },
  { path: '/favorites', load: () => import('./pages/favorites.js'), title: 'Favorites', nav: 'favorites' },
  { path: '/review', load: () => import('./pages/review.js'), title: 'Review', nav: 'review' },
  { path: '/search', load: () => import('./pages/search.js'), title: 'Search', nav: 'search' },
  { path: '/tags', load: () => import('./pages/tags.js'), title: 'Tags', nav: 'tags' },
  { path: '/graph', load: () => import('./pages/graph.js'), title: 'Memory graph', nav: 'graph' },
  { path: '/journey', load: () => import('./pages/journey.js'), title: 'Developer journey', nav: 'journey' },
  { path: '/insights', load: () => import('./pages/insights.js'), title: 'Insights', nav: 'insights' },
  { path: '/profile', load: () => import('./pages/profile.js'), title: 'Profile' },
  { path: '/settings', load: () => import('./pages/settings.js'), title: 'Settings' },
];

function compile(path) {
  const keys = [];
  const re = new RegExp(`^${path.replace(/:[a-zA-Z]+/g, (m) => { keys.push(m.slice(1)); return '([^/]+)'; })}/?$`);
  return { re, keys };
}
const compiled = routes.map((r) => ({ ...r, ...compile(r.path) }));

export function parseHash(hash = location.hash) {
  const raw = hash.replace(/^#/, '') || '/';
  const [pathPart, queryPart = ''] = raw.split('?');
  const path = pathPart.startsWith('/') ? pathPart : `/${pathPart}`;
  return { path, query: Object.fromEntries(new URLSearchParams(queryPart)) };
}

function match(path) {
  for (const r of compiled) {
    const m = r.re.exec(path);
    if (m) return { route: r, params: Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])])) };
  }
  return null;
}

export function navigate(to, { replace = false } = {}) {
  const target = to.startsWith('#') ? to : `#${to}`;
  if (replace) { history.replaceState(null, '', target); window.dispatchEvent(new HashChangeEvent('hashchange')); }
  else location.hash = target;
}

export function createRouter({ root, ensureShell, removeShell, enterDemo }) {
  let cleanup = null;
  let token = 0;
  let redirectAfterLogin = null;
  let firstRender = true;

  async function resolve() {
    const my = ++token;
    await waitForAuthReady();
    const { path, query } = parseHash();
    const found = match(path);
    const s = authState.get();
    const appMode = isAppMode();

    if (!found) { return show({ load: () => import('./pages/notFound.js'), title: 'Not found', shell: appMode ? true : false }, {}, query, my); }
    const { route, params } = found;

    if (route.demo) { await enterDemo(); return navigate('/dashboard', { replace: true }); }
    if (route.path === '/' && appMode) return navigate('/dashboard', { replace: true });
    if (route.authPage && s.mode === 'user') return navigate(redirectAfterLogin || '/dashboard', { replace: true });
    if (!route.public && !appMode) { redirectAfterLogin = `${path}${location.hash.includes('?') ? `?${location.hash.split('?')[1]}` : ''}`; return navigate('/login', { replace: true }); }
    if (route.userOnly && s.mode !== 'user') return navigate(appMode ? '/dashboard' : '/login', { replace: true });
    if (s.mode === 'user' && s.profile && !s.profile.onboardingCompleted && !route.public && route.path !== '/onboarding') {
      return navigate('/onboarding', { replace: true });
    }
    if (s.mode === 'user' && redirectAfterLogin && !route.public) redirectAfterLogin = null;
    return show(route, params, query, my);
  }

  async function show(route, params, query, my) {
    const useShell = route.shell === 'auto' ? isAppMode() : route.shell !== false;
    let outlet;
    if (useShell) { const sh = ensureShell(); sh.setActive(route.nav || ''); outlet = sh.outlet; }
    else { removeShell(); outlet = root; }

    try { cleanup?.(); } catch (e) { logError(e, 'page cleanup'); }
    cleanup = null;
    outlet.classList.remove('page-enter');
    render(outlet, html`<div class="page">${skeletonList(6)}</div>`);
    document.title = route.title ? `${route.title} · DevMemory` : 'DevMemory';

    let mod;
    try { mod = await route.load(); }
    catch (err) {
      logError(err, 'load page');
      render(outlet, html`<div class="page"><p class="muted">This page couldn’t load. Check your connection and reload.</p></div>`);
      return;
    }
    if (my !== token) return; // a newer navigation won
    outlet.innerHTML = '';
    try {
      const result = await mod.default(outlet, { params, query, props: route.props || {}, navigate });
      if (my !== token) { if (typeof result === 'function') result(); return; }
      cleanup = typeof result === 'function' ? result : null;
    } catch (err) {
      logError(err, `render ${route.path}`);
      render(outlet, html`<div class="page"><p class="muted">Something went wrong on this page. Reload to try again.</p></div>`);
    }
    if (!firstRender) {
      window.scrollTo(0, 0);
      outlet.scrollTop = 0;
      (outlet.querySelector('.page-title') || outlet).focus?.({ preventScroll: true });
    }
    firstRender = false;
  }

  window.addEventListener('hashchange', resolve);
  return { resolve };
}
