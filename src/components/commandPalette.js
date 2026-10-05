/**
 * Command palette (Ctrl/Cmd + Shift + P, or Ctrl/Cmd + K).
 * Runs actions and searches everything. Full keyboard support:
 * ↑/↓ to move, Enter to run, Esc to close.
 */
import { html, render, highlightText, raw } from '../utils/html.js';
import { openModal } from './modal.js';
import { icon } from './icons.js';
import { KIND_ICONS } from './ui.js';
import { searchService } from '../services/searchService.js';
import { modKey } from '../utils/dom.js';

let open = null;
const KIND_SINGULAR = { memory: 'Memory', snippet: 'Snippet', command: 'Command', project: 'Project', bookmark: 'Bookmark', collection: 'Collection' };

export function openCommandPalette({ actions = [], initialQuery = '' } = {}) {
  if (open) { open.root.querySelector('input')?.focus(); return; }
  const m = openModal({
    title: 'Command palette',
    size: 'palette',
    className: 'palette-modal',
    body: html`
      <div class="palette" role="combobox" aria-expanded="true" aria-haspopup="listbox" aria-owns="palette-list">
        <div class="palette__search">${icon('search')}
          <input class="palette__input" type="text" value="${initialQuery}" placeholder="Search memories, snippets, commands… or type a command" aria-label="Search or run a command" aria-autocomplete="list" aria-controls="palette-list" autocomplete="off" spellcheck="false" autofocus>
        </div>
        <ul class="palette__list" id="palette-list" role="listbox" aria-label="Results"></ul>
        <div class="palette__foot muted"><span><kbd>↑</kbd><kbd>↓</kbd> move</span><span><kbd>Enter</kbd> open</span><span><kbd>Esc</kbd> close</span><span>Try <code>#docker</code> or <code>type:bug</code></span></div>
      </div>`,
    onClose: () => { open = null; },
  });
  open = m;
  const input = m.root.querySelector('input');
  const list = m.root.querySelector('#palette-list');
  let items = [];
  let active = 0;
  let lastQuery = '';

  const run = (item) => {
    if (!item) return;
    if (item.type === 'search' && lastQuery) searchService.record(lastQuery, items.filter((i) => i.type === 'result').map((i) => i.result));
    m.close();
    setTimeout(() => item.run(), 0);
  };

  const paint = () => {
    const q = input.value.trim();
    lastQuery = q;
    const lower = q.toLowerCase();
    const matchedActions = actions.filter((a) => !q || a.label.toLowerCase().includes(lower) || (a.keywords || '').includes(lower)).slice(0, q ? 6 : 12);
    const results = q ? searchService.search(q, { limit: 8 }) : [];
    items = [
      ...results.map((r) => ({ type: 'result', result: r, run: () => {
        if (r.kind === 'bookmark' && r.url) location.hash = r.href; else location.hash = r.href.replace(/^#/, '#');
      } })),
      ...(q ? [{ type: 'search', run: () => { location.hash = `#/search?q=${encodeURIComponent(q)}`; } }] : []),
      ...matchedActions.map((a) => ({ type: 'action', action: a, run: a.run })),
    ];
    if (active >= items.length) active = 0;
    render(list, html`${items.map((it, i) => {
      const sel = i === active;
      const id = `pal-opt-${i}`;
      if (it.type === 'result') {
        const r = it.result;
        return html`<li id="${id}" role="option" aria-selected="${sel}" class="palette__item ${sel ? 'is-active' : ''}" data-i="${i}">
          <span class="palette__icon">${icon(KIND_ICONS[r.kind] || 'spark', { size: 16 })}</span>
          <span class="palette__text"><span class="palette__label">${raw(highlightText(r.title, q))}</span><span class="palette__sub"><span>${KIND_SINGULAR[r.kind]}</span>${r.subtitle ? html`<span>${r.subtitle}</span>` : ''}</span></span>
        </li>`;
      }
      if (it.type === 'search') {
        return html`<li id="${id}" role="option" aria-selected="${sel}" class="palette__item ${sel ? 'is-active' : ''}" data-i="${i}">
          <span class="palette__icon">${icon('search', { size: 16 })}</span><span class="palette__text"><span class="palette__label">See all results for “${q}”</span></span></li>`;
      }
      const a = it.action;
      return html`<li id="${id}" role="option" aria-selected="${sel}" class="palette__item ${sel ? 'is-active' : ''}" data-i="${i}">
        <span class="palette__icon">${icon(a.icon || 'zap', { size: 16 })}</span>
        <span class="palette__text"><span class="palette__label">${a.label}</span></span>
        ${a.shortcut ? html`<span class="palette__kbd">${a.shortcut.map((k) => html`<kbd>${k === 'Mod' ? modKey() : k}</kbd>`)}</span>` : ''}
      </li>`;
    })}${!items.length ? html`<li class="palette__empty" role="presentation">No matches. Press <kbd>Esc</kbd> to close.</li>` : ''}`);
    input.setAttribute('aria-activedescendant', items.length ? `pal-opt-${active}` : '');
    list.querySelector('.is-active')?.scrollIntoView({ block: 'nearest' });
  };

  input.addEventListener('input', () => { active = 0; paint(); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); active = (active + 1) % Math.max(items.length, 1); paint(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); active = (active - 1 + items.length) % Math.max(items.length, 1); paint(); }
    else if (e.key === 'Enter') { e.preventDefault(); run(items[active]); }
  });
  list.addEventListener('click', (e) => { const li = e.target.closest('[data-i]'); if (li) run(items[Number(li.dataset.i)]); });
  list.addEventListener('mousemove', (e) => {
    const li = e.target.closest('[data-i]');
    if (li && Number(li.dataset.i) !== active) { active = Number(li.dataset.i); paint(); }
  });
  paint();
}
