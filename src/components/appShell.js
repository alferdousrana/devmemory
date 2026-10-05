/** Application chrome: sidebar / drawer, top bar, mobile bottom nav, floating capture button. */
import { html, render } from '../utils/html.js';
import { icon, logo } from './icons.js';
import { avatar } from './ui.js';
import { authState } from '../state/authState.js';
import { dataStore, syncState } from '../state/dataStore.js';
import { dueQueue } from '../utils/spacedRepetition.js';
import { effectiveStreak } from '../services/activityService.js';
import { modKey } from '../utils/dom.js';
import { resolvedTheme } from '../utils/theme.js';

const NAV = [
  [['dashboard', 'Dashboard', 'home'], ['review', 'Review', 'repeat'], ['search', 'Search', 'search']],
  [['memories', 'Memories', 'brain'], ['errors', 'Errors & fixes', 'bug'], ['snippets', 'Snippets', 'code'], ['commands', 'Commands', 'terminal'],
    ['projects', 'Projects', 'folder'], ['bookmarks', 'Bookmarks', 'bookmark'], ['collections', 'Collections', 'layers'], ['favorites', 'Favorites', 'star']],
  [['insights', 'Insights', 'chart'], ['graph', 'Memory graph', 'graph'], ['journey', 'Developer journey', 'timeline'], ['tags', 'Tags', 'tag']],
];

const SYNC = {
  synced: { glyph: '●', label: 'Synced', title: 'All changes are saved to the cloud' },
  syncing: { glyph: '◐', label: 'Syncing', title: 'Saving changes to the cloud…' },
  offline: { glyph: '○', label: 'Offline', title: 'You’re offline. Changes are saved on this device and will sync later.' },
  demo: { glyph: '◇', label: 'Demo', title: 'Demo data — nothing is saved' },
};

export function mountShell(root, { onCapture, onPalette, onSignOut, onToggleTheme, onExitDemo }) {
  root.innerHTML = '';
  const shell = document.createElement('div');
  shell.className = 'shell';
  render(shell, html`
    <a class="skip-link" href="#main" data-skip>Skip to content</a>
    <div class="drawer-backdrop" data-drawer-close hidden></div>
    <aside class="sidebar" id="sidebar" aria-label="Main navigation">
      <a class="brand" href="#/dashboard" aria-label="DevMemory dashboard">${logo(26)}<span class="brand__name">DevMemory</span></a>
      <nav class="nav">${NAV.map((group) => html`<ul class="nav__group">${group.map(([key, label, ic]) => html`
        <li><a class="nav__link" href="#/${key}" data-nav="${key}">${icon(ic, { size: 17 })}<span>${label}</span>${key === 'review' ? html`<span class="nav__badge" data-review-badge hidden></span>` : ''}</a></li>`)}</ul>`)}
      </nav>
      <div class="sidebar__foot">
        <p class="streak" data-streak hidden></p>
        <div class="usermenu">
          <button type="button" class="usermenu__btn" data-usermenu aria-haspopup="menu" aria-expanded="false">
            <span data-avatar></span><span class="usermenu__name" data-username></span>${icon('chevronDown', { size: 14 })}
          </button>
          <div class="usermenu__pop" role="menu" hidden>
            <a role="menuitem" href="#/profile">${icon('user', { size: 16 })}Profile</a>
            <a role="menuitem" href="#/settings">${icon('sliders', { size: 16 })}Settings</a>
            <a role="menuitem" href="#/privacy">${icon('shield', { size: 16 })}Privacy</a>
            <button role="menuitem" type="button" data-signout>${icon('logout', { size: 16 })}<span data-signout-label>Sign out</span></button>
          </div>
        </div>
      </div>
    </aside>
    <div class="main-col">
      <header class="topbar">
        <button type="button" class="icon-btn topbar__menu" data-drawer-open aria-label="Open navigation" aria-controls="sidebar" aria-expanded="false">${icon('menu')}</button>
        <button type="button" class="searchbar" data-palette>
          ${icon('search', { size: 16 })}<span class="searchbar__text">Search or run a command</span><span class="searchbar__kbd"><kbd>${modKey()}</kbd><kbd>K</kbd></span>
        </button>
        <div class="topbar__right">
          <span class="sync" data-sync role="status" aria-live="polite"></span>
          <button type="button" class="icon-btn" data-theme-toggle aria-label="Toggle theme">${icon(resolvedTheme() === 'dark' ? 'sun' : 'moon')}</button>
          <button type="button" class="btn btn--primary btn--sm topbar__capture" data-capture>${icon('zap', { size: 15 })}<span>Capture</span><span class="kbd-hint"><kbd>${modKey()}</kbd><kbd>⇧</kbd><kbd>M</kbd></span></button>
        </div>
      </header>
      <div class="demo-banner" data-demo-banner hidden>
        <span>${icon('eye', { size: 15 })}You’re exploring sample data. Nothing you do here is saved.</span>
        <span class="demo-banner__actions"><a class="btn btn--sm btn--primary" href="#/register">Create free account</a><button type="button" class="btn btn--sm btn--ghost" data-exit-demo>Exit demo</button></span>
      </div>
      <main id="main" class="outlet" tabindex="-1"></main>
    </div>
    <nav class="bottom-nav" aria-label="Quick navigation">
      <a href="#/dashboard" data-nav="dashboard">${icon('home')}<span>Home</span></a>
      <a href="#/search" data-nav="search">${icon('search')}<span>Search</span></a>
      <button type="button" class="bottom-nav__fab" data-capture aria-label="Quick capture">${icon('plus', { size: 24 })}</button>
      <a href="#/review" data-nav="review">${icon('repeat')}<span>Review</span><span class="nav__badge nav__badge--dot" data-review-dot hidden></span></a>
      <button type="button" data-drawer-open aria-label="More navigation">${icon('menu')}<span>More</span></button>
    </nav>`);
  root.appendChild(shell);

  const $ = (s) => shell.querySelector(s);
  const outlet = $('#main');
  const sidebar = $('#sidebar');
  const backdrop = $('.drawer-backdrop');
  const userPop = $('.usermenu__pop');
  const userBtn = $('[data-usermenu]');

  const setDrawer = (openState) => {
    shell.classList.toggle('drawer-open', openState);
    backdrop.hidden = !openState;
    shell.querySelectorAll('[data-drawer-open]').forEach((b) => b.setAttribute('aria-expanded', String(openState)));
    if (openState) sidebar.querySelector('a, button')?.focus();
  };
  const setUserMenu = (openState) => {
    userPop.hidden = !openState;
    userBtn.setAttribute('aria-expanded', String(openState));
    if (openState) userPop.querySelector('[role="menuitem"]')?.focus();
  };

  const onClick = (e) => {
    const t = e.target;
    if (t.closest('[data-capture]')) { setDrawer(false); onCapture(); return; }
    if (t.closest('[data-palette]')) { onPalette(); return; }
    if (t.closest('[data-theme-toggle]')) {
      const next = onToggleTheme();
      $('[data-theme-toggle]').innerHTML = icon(next === 'dark' ? 'sun' : 'moon').value;
      return;
    }
    if (t.closest('[data-drawer-open]')) { setDrawer(true); return; }
    if (t.closest('[data-drawer-close]')) { setDrawer(false); return; }
    if (t.closest('[data-usermenu]')) { setUserMenu(userPop.hidden); return; }
    if (t.closest('[data-signout]')) { setUserMenu(false); onSignOut(); return; }
    if (t.closest('[data-exit-demo]')) { onExitDemo(); return; }
    if (t.closest('[data-skip]')) { e.preventDefault(); outlet.focus(); return; }
    if (!t.closest('.usermenu')) setUserMenu(false);
    if (t.closest('.sidebar a')) setDrawer(false);
  };
  const onKey = (e) => {
    if (e.key === 'Escape') {
      if (!userPop.hidden) { setUserMenu(false); userBtn.focus(); }
      if (shell.classList.contains('drawer-open')) setDrawer(false);
    }
    if (!userPop.hidden && ['ArrowDown', 'ArrowUp'].includes(e.key) && e.target.closest('.usermenu__pop')) {
      e.preventDefault();
      const items = [...userPop.querySelectorAll('[role="menuitem"]')];
      const i = items.indexOf(document.activeElement);
      items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length].focus();
    }
  };
  shell.addEventListener('click', onClick);
  shell.addEventListener('keydown', onKey);

  const paintAuth = (s) => {
    $('[data-avatar]').innerHTML = avatar(s.profile || s.currentUser, 28).value;
    $('[data-username]').textContent = s.profile?.displayName || s.currentUser?.displayName || 'Account';
    $('[data-demo-banner]').hidden = s.mode !== 'demo';
    $('[data-signout-label]').textContent = s.mode === 'demo' ? 'Exit demo' : 'Sign out';
    const streak = effectiveStreak(s.profile);
    const st = $('[data-streak]');
    st.hidden = !streak;
    st.textContent = `🔥 ${streak} day memory streak`;
  };
  const paintData = (d) => {
    const due = dueQueue(d.memories).length;
    const badge = $('[data-review-badge]');
    badge.hidden = !due; badge.textContent = due > 99 ? '99+' : String(due);
    badge.setAttribute('aria-label', `${due} due`);
    $('[data-review-dot]').hidden = !due;
  };
  const paintSync = (s) => {
    const meta = SYNC[s.status] || SYNC.synced;
    const el = $('[data-sync]');
    el.className = `sync sync--${s.status}`;
    el.title = meta.title;
    el.innerHTML = `<span class="sync__glyph" aria-hidden="true">${meta.glyph}</span><span class="sync__label">${meta.label}</span>`;
  };
  const unsubs = [authState.subscribe(paintAuth), dataStore.subscribe(paintData), syncState.subscribe(paintSync)];
  paintAuth(authState.get()); paintData(dataStore.get()); paintSync(syncState.get());

  return {
    outlet,
    setActive(key) {
      shell.querySelectorAll('[data-nav]').forEach((a) => {
        const on = a.dataset.nav === key;
        a.classList.toggle('is-active', on);
        if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
      });
    },
    destroy() { unsubs.forEach((u) => u()); shell.removeEventListener('click', onClick); shell.remove(); },
  };
}
