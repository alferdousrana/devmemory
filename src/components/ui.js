/** Small shared view helpers (all return SafeHTML). */
import { html } from '../utils/html.js';
import { icon } from './icons.js';
import { TYPE_META, LANGUAGE_LABELS } from '../data/schema.js';
import { relativeTime } from '../utils/date.js';

export const KIND_ICONS = { memory: 'brain', snippet: 'code', command: 'terminal', project: 'folder', bookmark: 'bookmark', collection: 'layers' };
export const TYPE_ICONS = {
  BUG: 'bug', SOLUTION: 'check', CONCEPT: 'spark', COMMAND: 'terminal', SNIPPET: 'code', API: 'globe', DATABASE: 'database',
  DOCKER: 'layers', GIT: 'merge', LINUX: 'terminal', NETWORKING: 'globe', ARCHITECTURE: 'graph', PROJECT: 'folder',
  LEARNING: 'brain', BOOKMARK: 'bookmark', OTHER: 'tag',
};

export function typeBadge(type) {
  const meta = TYPE_META[type] || TYPE_META.OTHER;
  return html`<span class="type-badge" style="--hue:${meta.hue}">${icon(TYPE_ICONS[type] || 'tag', { size: 13 })}${meta.label}</span>`;
}

const STATUS_LABEL = { unresolved: 'Unresolved', investigating: 'Investigating', resolved: 'Resolved', active: 'Active', archived: 'Archived', paused: 'Paused', shipped: 'Shipped' };
export function statusBadge(status) {
  if (!status || status === 'active') return '';
  return html`<span class="status status--${status}">${STATUS_LABEL[status] || status}</span>`;
}

export function tagChips(tags = [], { max = 6, linked = true } = {}) {
  const list = (tags || []).slice(0, max);
  if (!list.length) return '';
  return html`<span class="tags">${list.map((t) => (linked
    ? html`<a class="tag" href="#/search?q=${encodeURIComponent(`#${t}`)}">#${t}</a>`
    : html`<span class="tag">#${t}</span>`))}${tags.length > max ? html`<span class="tag tag--more">+${tags.length - max}</span>` : ''}</span>`;
}

export function langLabel(lang) { return LANGUAGE_LABELS[lang] || lang || 'Plain text'; }

export function timeAgo(ts) {
  if (!ts) return '';
  return html`<time datetime="${new Date(ts).toISOString()}" title="${new Date(ts).toLocaleString()}">${relativeTime(ts)}</time>`;
}

export function emptyState({ iconName = 'inbox', title, text = '', action = null }) {
  return html`<div class="empty">
    <div class="empty__icon">${icon(iconName, { size: 26 })}</div>
    <h3 class="empty__title">${title}</h3>
    ${text ? html`<p class="empty__text">${text}</p>` : ''}
    ${action ? html`<div class="empty__action">${action}</div>` : ''}
  </div>`;
}

export function skeletonList(n = 5) {
  return html`<div class="skeleton-list" aria-busy="true" aria-label="Loading">${Array.from({ length: n }, () => html`
    <div class="skeleton-row"><span class="sk sk--icon"></span><span class="sk-col"><span class="sk sk--line"></span><span class="sk sk--line sk--short"></span></span></div>`)}</div>`;
}

export function skeletonCards(n = 6) {
  return html`<div class="card-grid" aria-busy="true" aria-label="Loading">${Array.from({ length: n }, () => html`<div class="panel sk-card"><span class="sk sk--line"></span><span class="sk sk--line sk--short"></span><span class="sk sk--block"></span></div>`)}</div>`;
}

export function errorState(err, retryLabel = 'Reload') {
  return emptyState({
    iconName: 'alert',
    title: 'This section couldn’t load',
    text: err?.code === 'permission-denied' ? 'Your session may have expired. Sign out and back in.' : 'Check your connection, then reload the page.',
    action: html`<button class="btn btn--ghost" type="button" data-action="reload">${retryLabel}</button>`,
  });
}

export function avatar(profile, size = 32) {
  const name = profile?.displayName || profile?.email || '?';
  const initials = name.split(/[\s@._-]+/).filter(Boolean).slice(0, 2).map((s) => s[0].toUpperCase()).join('');
  if (profile?.photoURL) {
    return html`<img class="avatar" src="${profile.photoURL}" alt="" width="${size}" height="${size}" referrerpolicy="no-referrer" loading="lazy">`;
  }
  return html`<span class="avatar avatar--initials" style="width:${size}px;height:${size}px" aria-hidden="true">${initials}</span>`;
}

export function pageHeader({ title, subtitle = '', actions = '' }) {
  return html`<header class="page-head">
    <div class="page-head__text"><h1 class="page-title" tabindex="-1">${title}</h1>${subtitle ? html`<p class="page-sub">${subtitle}</p>` : ''}</div>
    ${actions ? html`<div class="page-head__actions">${actions}</div>` : ''}
  </header>`;
}

export function favButton(isFav, attrs = '') {
  return html`<button type="button" class="icon-btn fav ${isFav ? 'is-on' : ''}" ${attrs} aria-pressed="${isFav ? 'true' : 'false'}" aria-label="${isFav ? 'Remove from favorites' : 'Add to favorites'}">${icon('star', { size: 16 })}</button>`;
}
