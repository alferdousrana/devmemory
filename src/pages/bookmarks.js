/** Bookmarks: docs, repos, answers, videos, posts. */
import { html, render } from '../utils/html.js';
import { icon } from '../components/icons.js';
import { pageHeader, emptyState, skeletonList } from '../components/ui.js';
import { bookmarkRow } from '../components/items.js';
import { watch } from '../components/reactive.js';
import { bindItemActions } from '../components/itemActions.js';
import { openBookmarkEditor } from '../components/editors.js';
import { searchService } from '../services/searchService.js';
import { bookmarkService } from '../services/bookmarkService.js';
import { dataStore } from '../state/dataStore.js';
import { BOOKMARK_CATEGORIES } from '../data/schema.js';
import { debounce } from '../utils/dom.js';

const CAT_LABEL = { documentation: 'Docs', github: 'GitHub', stackoverflow: 'Stack Overflow', youtube: 'YouTube', blog: 'Blogs', tutorial: 'Tutorials', other: 'Other' };

export default function bookmarksPage(el, { query }) {
  const state = { q: '', cat: '' };
  render(el, html`<div class="page">
    ${pageHeader({ title: 'Bookmarks', subtitle: 'Docs, repos, answers and tutorials worth finding again.', actions: html`<button type="button" class="btn btn--primary" data-new>${icon('plus', { size: 16 })}New bookmark</button>` })}
    <div class="toolbar">
      <label class="toolbar__search">${icon('search', { size: 16 })}<span class="visually-hidden">Search bookmarks</span><input class="input input--bare" data-q placeholder="Search bookmarks…" autocomplete="off"></label>
    </div>
    <div class="chips" role="group" aria-label="Category"><button type="button" class="chip-btn is-on" aria-pressed="true" data-cat="">All</button>${BOOKMARK_CATEGORIES.map((c) => html`<button type="button" class="chip-btn" aria-pressed="false" data-cat="${c}">${CAT_LABEL[c]}</button>`)}</div>
    <div data-list></div>
  </div>`);
  const list = el.querySelector('[data-list]');
  const unbind = bindItemActions(el);
  const paint = (d) => {
    if (!d.loaded.bookmarks) { render(list, skeletonList(5)); return; }
    let items = d.bookmarks;
    if (state.q.trim()) {
      const ids = new Set(searchService.search(state.q, { kinds: ['bookmark'], limit: 500 }).map((r) => r.id));
      items = items.filter((b) => ids.has(b.id));
    }
    items = items.filter((b) => !state.cat || b.category === state.cat);
    render(list, items.length ? html`<ul class="rows">${items.map(bookmarkRow)}</ul>`
      : d.bookmarks.length ? emptyState({ iconName: 'filter', title: 'No bookmarks match' })
        : emptyState({ iconName: 'bookmark', title: 'No bookmarks yet', text: 'Save the doc page or answer that finally explained it.', action: html`<button type="button" class="btn btn--primary" data-new>New bookmark</button>` }));
  };
  const stop = watch(paint);
  const repaint = () => paint(dataStore.get());
  el.querySelector('[data-q]').addEventListener('input', debounce((e) => { state.q = e.target.value; repaint(); }, 150));
  el.addEventListener('click', (e) => {
    if (e.target.closest('[data-new]')) openBookmarkEditor();
    const c = e.target.closest('[data-cat]');
    if (c) { state.cat = c.dataset.cat; el.querySelectorAll('[data-cat]').forEach((b) => { b.classList.toggle('is-on', b === c); b.setAttribute('aria-pressed', String(b === c)); }); repaint(); }
  });
  if (query.new) { openBookmarkEditor(); history.replaceState(null, '', '#/bookmarks'); }
  if (query.open) { const b = bookmarkService.get(query.open); if (b) { openBookmarkEditor(b); history.replaceState(null, '', '#/bookmarks'); } }
  return () => { stop(); unbind(); };
}
