/** Row/card renderers shared by list pages, search, favorites, collections. */
import { html, raw, highlightText, safeUrl } from '../utils/html.js';
import { icon } from './icons.js';
import { typeBadge, statusBadge, tagChips, timeAgo, favButton, langLabel } from './ui.js';
import { dataStore } from '../state/dataStore.js';

const projectName = (id) => (id ? dataStore.get().projects.find((p) => p.id === id)?.name : '');

export function memoryRow(m, { query = '' } = {}) {
  const pn = projectName(m.projectId);
  const summary = m.solution || m.problem || m.content || '';
  return html`<li class="row">
    <a class="row__main" href="#/memories/${m.id}">
      <span class="row__title">${raw(highlightText(m.title, query))}</span>
      ${summary ? html`<span class="row__summary">${summary.slice(0, 180)}</span>` : ''}
      <span class="row__meta">${typeBadge(m.type)}${statusBadge(m.status)}${pn ? html`<span class="meta-item">${icon('folder', { size: 12 })}${pn}</span>` : ''}${(m.attachments || []).length ? html`<span class="meta-item">${icon('image', { size: 12 })}${m.attachments.length}</span>` : ''}${timeAgo(m.updatedAt || m.createdAt)}</span>
    </a>
    <div class="row__side">${tagChips(m.tags, { max: 3 })}${favButton(m.isFavorite, html`data-fav-memory="${m.id}"`)}</div>
  </li>`;
}

export function snippetCard(s, { compact = false } = {}) {
  return html`<article class="snip" data-snippet="${s.id}">
    <header class="snip__head">
      <button type="button" class="snip__title" data-open-snippet="${s.id}">${s.title}</button>
      <span class="snip__actions">
        ${favButton(s.isFavorite, html`data-fav-snippet="${s.id}"`)}
        <button type="button" class="icon-btn icon-btn--sm" data-copy-snippet="${s.id}" aria-label="Copy ${s.title}">${icon('copy', { size: 15 })}</button>
      </span>
    </header>
    ${s.description && !compact ? html`<p class="snip__desc">${s.description}</p>` : ''}
    <pre class="snip__code"><code data-lang="${s.language}">${String(s.code || '').split('\n').slice(0, compact ? 6 : 12).join('\n')}</code></pre>
    <footer class="snip__foot"><span class="lang-pill">${langLabel(s.language)}</span>${tagChips(s.tags, { max: 3 })}${s.copyCount ? html`<span class="muted small">copied ${s.copyCount}×</span>` : ''}</footer>
  </article>`;
}

export function commandRow(c) {
  const pn = projectName(c.projectId);
  return html`<li class="cmd" data-command="${c.id}">
    <div class="cmd__line">
      <span class="cmd__prompt" aria-hidden="true">$</span>
      <code class="cmd__text">${c.command}</code>
      <button type="button" class="btn btn--tiny btn--ghost cmd__copy" data-copy-command="${c.id}" aria-label="Copy command">${icon('copy', { size: 14 })}<span>Copy</span></button>
    </div>
    <div class="cmd__info">
      ${c.description ? html`<span class="cmd__desc">${c.description}</span>` : ''}
      <span class="row__meta"><span class="meta-item">${c.category}</span>${c.os && c.os !== 'any' ? html`<span class="meta-item">${c.os}</span>` : ''}${pn ? html`<span class="meta-item">${icon('folder', { size: 12 })}${pn}</span>` : ''}${c.copyCount ? html`<span class="meta-item">copied ${c.copyCount}×</span>` : ''}</span>
      <span class="cmd__tools">${favButton(c.isFavorite, html`data-fav-command="${c.id}"`)}<button type="button" class="icon-btn icon-btn--sm" data-edit-command="${c.id}" aria-label="Edit command">${icon('edit', { size: 15 })}</button></span>
    </div>
    ${c.example ? html`<pre class="cmd__example"><code data-lang="bash">${c.example}</code></pre>` : ''}
  </li>`;
}

export function bookmarkRow(b) {
  let host = '';
  try { host = new URL(b.url).hostname.replace(/^www\./, ''); } catch { host = b.url; }
  return html`<li class="row" data-bookmark="${b.id}">
    <div class="row__main">
      <a class="row__title" href="${safeUrl(b.url)}" target="_blank" rel="noopener noreferrer">${b.title}${icon('external', { size: 13, className: 'inline-icon' })}</a>
      ${b.description ? html`<span class="row__summary">${b.description}</span>` : ''}
      <span class="row__meta"><span class="meta-item">${host}</span><span class="meta-item">${b.category}</span>${projectName(b.projectId) ? html`<span class="meta-item">${icon('folder', { size: 12 })}${projectName(b.projectId)}</span>` : ''}</span>
    </div>
    <div class="row__side">${tagChips(b.tags, { max: 3 })}${favButton(b.isFavorite, html`data-fav-bookmark="${b.id}"`)}
      <button type="button" class="icon-btn icon-btn--sm" data-edit-bookmark="${b.id}" aria-label="Edit bookmark">${icon('edit', { size: 15 })}</button></div>
  </li>`;
}

export function projectCard(p, { attention = [] } = {}) {
  return html`<a class="project-card" href="#/projects/${p.id}">
    <span class="project-card__head"><span class="project-card__name">${p.name}</span>${statusBadge(p.status === 'active' ? '' : p.status)}${p.isFavorite ? icon('star', { size: 14, className: 'star-on' }) : ''}</span>
    ${p.description ? html`<span class="project-card__desc">${p.description}</span>` : ''}
    <span class="stack">${(p.techStack || []).slice(0, 6).map((t) => html`<span class="stack__item">${t}</span>`)}</span>
    ${attention.length ? html`<span class="attention">${icon('alert', { size: 13 })}${attention[0]}</span>` : ''}
  </a>`;
}
