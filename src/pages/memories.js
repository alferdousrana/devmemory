/** All memories with filters, sort and quick text filter. */
import { html, render } from '../utils/html.js';
import { icon } from '../components/icons.js';
import { pageHeader, emptyState, skeletonList } from '../components/ui.js';
import { memoryRow } from '../components/items.js';
import { watch } from '../components/reactive.js';
import { bindItemActions } from '../components/itemActions.js';
import { searchService } from '../services/searchService.js';
import { isIncomplete } from '../services/insightsService.js';
import { MEMORY_TYPES, TYPE_META } from '../data/schema.js';
import { debounce } from '../utils/dom.js';
import { allTags } from '../components/tagInput.js';
import { dataStore } from '../state/dataStore.js';

const SORTS = { updated: 'Recently updated', newest: 'Newest', oldest: 'Oldest first', title: 'Title A–Z' };
const FILTERS = { all: 'All', favorites: 'Favorites', untagged: 'Untagged', incomplete: 'Missing details' };

export default function memoriesPage(el, { query }) {
  const state = {
    q: query.q || '', type: query.type || '', tag: query.tag || '', project: query.project || '',
    filter: FILTERS[query.filter] ? query.filter : 'all', sort: SORTS[query.sort] ? query.sort : 'updated',
  };
  const d0 = dataStore.get();
  render(el, html`<div class="page">
    ${pageHeader({ title: 'Memories', subtitle: 'Everything you’ve saved — bugs, fixes, concepts and learnings.', actions: html`<a class="btn btn--primary" href="#/memories/new">${icon('plus', { size: 16 })}New memory</a>` })}
    <div class="toolbar" role="search">
      <label class="toolbar__search">${icon('search', { size: 16 })}<span class="visually-hidden">Filter memories</span><input class="input input--bare" data-q value="${state.q}" placeholder="Filter memories…" autocomplete="off"></label>
      <label><span class="visually-hidden">Type</span><select class="input input--sm" data-type><option value="">All types</option>${MEMORY_TYPES.map((t) => html`<option value="${t}" ${t === state.type ? 'selected' : ''}>${TYPE_META[t].label}</option>`)}</select></label>
      <label><span class="visually-hidden">Project</span><select class="input input--sm" data-project><option value="">All projects</option>${d0.projects.map((p) => html`<option value="${p.id}" ${p.id === state.project ? 'selected' : ''}>${p.name}</option>`)}</select></label>
      <label><span class="visually-hidden">Tag</span><select class="input input--sm" data-tag><option value="">All tags</option>${allTags(d0).map((t) => html`<option value="${t}" ${t === state.tag ? 'selected' : ''}>#${t}</option>`)}</select></label>
      <label><span class="visually-hidden">Sort</span><select class="input input--sm" data-sort>${Object.entries(SORTS).map(([k, v]) => html`<option value="${k}" ${k === state.sort ? 'selected' : ''}>${v}</option>`)}</select></label>
    </div>
    <div class="chips" role="group" aria-label="Quick filters">${Object.entries(FILTERS).map(([k, v]) => html`<button type="button" class="chip-btn ${k === state.filter ? 'is-on' : ''}" aria-pressed="${k === state.filter}" data-filter="${k}">${v}</button>`)}</div>
    <p class="result-count muted small" aria-live="polite" data-count></p>
    <div data-list></div>
  </div>`);
  const list = el.querySelector('[data-list]');
  const count = el.querySelector('[data-count]');
  const unbind = bindItemActions(el);

  const paint = (d) => {
    if (!d.loaded.memories) { render(list, skeletonList(6)); return; }
    let items;
    if (state.q.trim()) {
      const ids = new Set(searchService.search(state.q, { kinds: ['memory'], limit: 500 }).map((r) => r.id));
      items = d.memories.filter((m) => ids.has(m.id));
    } else items = [...d.memories];
    items = items.filter((m) => (!state.type || m.type === state.type)
      && (!state.tag || (m.tags || []).includes(state.tag))
      && (!state.project || m.projectId === state.project)
      && (state.filter !== 'favorites' || m.isFavorite)
      && (state.filter !== 'untagged' || !(m.tags || []).length)
      && (state.filter !== 'incomplete' || isIncomplete(m)));
    if (!state.q.trim()) {
      const by = { updated: (a, b) => (b.updatedAt || 0) - (a.updatedAt || 0), newest: (a, b) => (b.createdAt || 0) - (a.createdAt || 0), oldest: (a, b) => (a.createdAt || 0) - (b.createdAt || 0), title: (a, b) => a.title.localeCompare(b.title) };
      items.sort(by[state.sort]);
    }
    count.textContent = `${items.length} memor${items.length === 1 ? 'y' : 'ies'}`;
    render(list, items.length
      ? html`<ul class="rows">${items.map((m) => memoryRow(m, { query: state.q }))}</ul>`
      : d.memories.length
        ? emptyState({ iconName: 'filter', title: 'No memories match these filters', action: html`<button type="button" class="btn btn--ghost" data-reset>Clear filters</button>` })
        : emptyState({ iconName: 'brain', title: 'No memories yet', text: 'Save the next bug you fix, a concept you learned, or a decision you made.', action: html`<a class="btn btn--primary" href="#/memories/new">New memory</a><button type="button" class="btn btn--ghost" data-capture>Quick capture</button>` }));
  };
  const stop = watch(paint);
  const repaint = () => paint(dataStore.get());

  el.querySelector('[data-q]').addEventListener('input', debounce((e) => { state.q = e.target.value; repaint(); }, 150));
  for (const [sel, key] of [['[data-type]', 'type'], ['[data-project]', 'project'], ['[data-tag]', 'tag'], ['[data-sort]', 'sort']]) {
    el.querySelector(sel).addEventListener('change', (e) => { state[key] = e.target.value; repaint(); });
  }
  el.addEventListener('click', (e) => {
    const f = e.target.closest('[data-filter]');
    if (f) {
      state.filter = f.dataset.filter;
      el.querySelectorAll('[data-filter]').forEach((b) => { b.classList.toggle('is-on', b === f); b.setAttribute('aria-pressed', String(b === f)); });
      repaint();
    }
    if (e.target.closest('[data-reset]')) { location.hash = '#/memories'; }
  });
  return () => { stop(); unbind(); };
}
