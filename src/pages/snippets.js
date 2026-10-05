/** Snippet vault. */
import { html, render } from '../utils/html.js';
import { icon } from '../components/icons.js';
import { pageHeader, emptyState, skeletonCards } from '../components/ui.js';
import { snippetCard } from '../components/items.js';
import { watch } from '../components/reactive.js';
import { bindItemActions } from '../components/itemActions.js';
import { highlightWithin } from '../components/codeHighlight.js';
import { openSnippetEditor } from '../components/editors.js';
import { searchService } from '../services/searchService.js';
import { snippetService } from '../services/snippetService.js';
import { dataStore } from '../state/dataStore.js';
import { SNIPPET_LANGUAGES, LANGUAGE_LABELS } from '../data/schema.js';
import { debounce } from '../utils/dom.js';

export default function snippetsPage(el, { query }) {
  const state = { q: '', lang: query.lang || '', project: '', fav: false };
  render(el, html`<div class="page page--wide">
    ${pageHeader({ title: 'Snippets', subtitle: 'Code you reuse. Highlighted, searchable, one click to copy.', actions: html`<button type="button" class="btn btn--primary" data-new>${icon('plus', { size: 16 })}New snippet</button>` })}
    <div class="toolbar">
      <label class="toolbar__search">${icon('search', { size: 16 })}<span class="visually-hidden">Search snippets</span><input class="input input--bare" data-q placeholder="Search titles, descriptions and code…" autocomplete="off"></label>
      <label><span class="visually-hidden">Language</span><select class="input input--sm" data-lang><option value="">All languages</option>${SNIPPET_LANGUAGES.map((l) => html`<option value="${l}" ${l === state.lang ? 'selected' : ''}>${LANGUAGE_LABELS[l]}</option>`)}</select></label>
      <label><span class="visually-hidden">Project</span><select class="input input--sm" data-project><option value="">All projects</option>${dataStore.get().projects.map((p) => html`<option value="${p.id}">${p.name}</option>`)}</select></label>
      <button type="button" class="chip-btn" data-favs aria-pressed="false">${icon('star', { size: 14 })}Favorites</button>
    </div>
    <div data-list></div>
  </div>`);
  const list = el.querySelector('[data-list]');
  const unbind = bindItemActions(el);

  const paint = (d) => {
    if (!d.loaded.snippets) { render(list, skeletonCards(4)); return; }
    let items = d.snippets;
    if (state.q.trim()) {
      const ids = new Set(searchService.search(state.q, { kinds: ['snippet'], limit: 500 }).map((r) => r.id));
      const ql = state.q.toLowerCase();
      items = items.filter((s) => ids.has(s.id) || String(s.code).toLowerCase().includes(ql));
    }
    items = items.filter((s) => (!state.lang || s.language === state.lang) && (!state.project || s.projectId === state.project) && (!state.fav || s.isFavorite));
    render(list, items.length
      ? html`<div class="snip-grid">${items.map((s) => snippetCard(s))}</div>`
      : d.snippets.length ? emptyState({ iconName: 'filter', title: 'No snippets match' })
        : emptyState({ iconName: 'code', title: 'No snippets yet', text: 'Save the code you keep rewriting: decorators, queries, configs, Dockerfiles.', action: html`<button type="button" class="btn btn--primary" data-new>New snippet</button>` }));
    highlightWithin(list);
  };
  const stop = watch(paint);
  const repaint = () => paint(dataStore.get());

  el.querySelector('[data-q]').addEventListener('input', debounce((e) => { state.q = e.target.value; repaint(); }, 150));
  el.querySelector('[data-lang]').addEventListener('change', (e) => { state.lang = e.target.value; repaint(); });
  el.querySelector('[data-project]').addEventListener('change', (e) => { state.project = e.target.value; repaint(); });
  el.addEventListener('click', (e) => {
    if (e.target.closest('[data-new]')) openSnippetEditor();
    const f = e.target.closest('[data-favs]');
    if (f) { state.fav = !state.fav; f.classList.toggle('is-on', state.fav); f.setAttribute('aria-pressed', String(state.fav)); repaint(); }
  });
  if (query.new) { openSnippetEditor(); history.replaceState(null, '', '#/snippets'); }
  if (query.open) {
    const open = () => { const s = snippetService.get(query.open); if (s) { openSnippetEditor(s); history.replaceState(null, '', '#/snippets'); return true; } return false; };
    if (!open()) { const u = dataStore.subscribe(() => { if (open()) u(); }); setTimeout(u, 5000); }
  }
  return () => { stop(); unbind(); };
}
