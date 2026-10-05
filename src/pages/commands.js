/** Command vault, grouped by category. */
import { html, render } from '../utils/html.js';
import { icon } from '../components/icons.js';
import { pageHeader, emptyState, skeletonList } from '../components/ui.js';
import { commandRow } from '../components/items.js';
import { watch } from '../components/reactive.js';
import { bindItemActions } from '../components/itemActions.js';
import { highlightWithin } from '../components/codeHighlight.js';
import { openCommandEditor } from '../components/editors.js';
import { searchService } from '../services/searchService.js';
import { commandService } from '../services/commandService.js';
import { dataStore } from '../state/dataStore.js';
import { COMMAND_CATEGORIES, COMMAND_OS } from '../data/schema.js';
import { debounce } from '../utils/dom.js';

export default function commandsPage(el, { query }) {
  const state = { q: '', category: '', os: '', sort: query.sort === 'used' ? 'used' : 'category' };
  render(el, html`<div class="page">
    ${pageHeader({ title: 'Commands', subtitle: 'Git, Docker, Linux, databases, cloud — the ones you keep looking up.', actions: html`<button type="button" class="btn btn--primary" data-new>${icon('plus', { size: 16 })}New command</button>` })}
    <div class="toolbar">
      <label class="toolbar__search">${icon('search', { size: 16 })}<span class="visually-hidden">Search commands</span><input class="input input--bare" data-q placeholder="Search commands…" autocomplete="off"></label>
      <label><span class="visually-hidden">Category</span><select class="input input--sm" data-cat><option value="">All categories</option>${COMMAND_CATEGORIES.map((c) => html`<option>${c}</option>`)}</select></label>
      <label><span class="visually-hidden">OS</span><select class="input input--sm" data-os><option value="">Any OS</option>${COMMAND_OS.filter((o) => o !== 'any').map((o) => html`<option value="${o}">${o}</option>`)}</select></label>
      <label><span class="visually-hidden">Sort</span><select class="input input--sm" data-sort><option value="category" ${state.sort === 'category' ? 'selected' : ''}>By category</option><option value="used" ${state.sort === 'used' ? 'selected' : ''}>Most used</option></select></label>
    </div>
    <div data-list></div>
  </div>`);
  const list = el.querySelector('[data-list]');
  const unbind = bindItemActions(el);

  const paint = (d) => {
    if (!d.loaded.commands) { render(list, skeletonList(6)); return; }
    let items = d.commands;
    if (state.q.trim()) {
      const ids = new Set(searchService.search(state.q, { kinds: ['command'], limit: 500 }).map((r) => r.id));
      items = items.filter((c) => ids.has(c.id) || c.command.toLowerCase().includes(state.q.toLowerCase()));
    }
    items = items.filter((c) => (!state.category || c.category === state.category) && (!state.os || c.os === state.os || c.os === 'any'));
    if (!items.length) {
      render(list, d.commands.length ? emptyState({ iconName: 'filter', title: 'No commands match' })
        : emptyState({ iconName: 'terminal', title: 'No commands yet', text: 'Save a command the second time you search for it.', action: html`<button type="button" class="btn btn--primary" data-new>New command</button>` }));
      return;
    }
    if (state.sort === 'used') {
      const sorted = [...items].sort((a, b) => (b.copyCount || 0) - (a.copyCount || 0) || (b.lastUsedAt || 0) - (a.lastUsedAt || 0));
      render(list, html`<ul class="cmd-list">${sorted.map(commandRow)}</ul>`);
    } else {
      const groups = {};
      for (const c of items) (groups[c.category || 'Other'] ||= []).push(c);
      const order = Object.keys(groups).sort((a, b) => COMMAND_CATEGORIES.indexOf(a) - COMMAND_CATEGORIES.indexOf(b));
      render(list, html`${order.map((g) => html`<section class="cmd-group"><h2 class="cmd-group__title">${g}<span class="muted">${groups[g].length}</span></h2><ul class="cmd-list">${groups[g].map(commandRow)}</ul></section>`)}`);
    }
    highlightWithin(list);
  };
  const stop = watch(paint);
  const repaint = () => paint(dataStore.get());
  el.querySelector('[data-q]').addEventListener('input', debounce((e) => { state.q = e.target.value; repaint(); }, 150));
  el.querySelector('[data-cat]').addEventListener('change', (e) => { state.category = e.target.value; repaint(); });
  el.querySelector('[data-os]').addEventListener('change', (e) => { state.os = e.target.value; repaint(); });
  el.querySelector('[data-sort]').addEventListener('change', (e) => { state.sort = e.target.value; repaint(); });
  el.addEventListener('click', (e) => { if (e.target.closest('[data-new]')) openCommandEditor(); });
  if (query.new) { openCommandEditor(); history.replaceState(null, '', '#/commands'); }
  if (query.open) {
    const open = () => { const c = commandService.get(query.open); if (c) { openCommandEditor(c); history.replaceState(null, '', '#/commands'); return true; } return false; };
    if (!open()) { const u = dataStore.subscribe(() => { if (open()) u(); }); setTimeout(u, 5000); }
  }
  return () => { stop(); unbind(); };
}
