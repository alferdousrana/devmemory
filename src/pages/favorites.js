/** Favorites across memories, snippets, commands, projects and bookmarks. */
import { html, render } from '../utils/html.js';
import { pageHeader, emptyState, skeletonList } from '../components/ui.js';
import { memoryRow, snippetCard, commandRow, bookmarkRow, projectCard } from '../components/items.js';
import { watch } from '../components/reactive.js';
import { bindItemActions } from '../components/itemActions.js';
import { highlightWithin } from '../components/codeHighlight.js';

export default function favoritesPage(el) {
  el.innerHTML = '<div class="page page--wide"></div>';
  const page = el.firstElementChild;
  const unbind = bindItemActions(page);
  const stop = watch((d) => {
    if (!d.loaded.memories) { render(page, skeletonList(5)); return; }
    const f = (arr) => arr.filter((x) => x.isFavorite);
    const mem = f(d.memories); const sn = f(d.snippets); const cm = f(d.commands); const pr = f(d.projects); const bm = f(d.bookmarks);
    const total = mem.length + sn.length + cm.length + pr.length + bm.length;
    render(page, html`${pageHeader({ title: 'Favorites', subtitle: 'Star anything to keep it one click away.' })}
      ${!total ? emptyState({ iconName: 'star', title: 'No favorites yet', text: 'Use the star on any memory, snippet, command, project or bookmark.' }) : ''}
      ${mem.length ? html`<section class="fav-sec"><h2 class="section-h">Memories</h2><ul class="rows">${mem.map((m) => memoryRow(m))}</ul></section>` : ''}
      ${pr.length ? html`<section class="fav-sec"><h2 class="section-h">Projects</h2><div class="project-grid">${pr.map((p) => projectCard(p))}</div></section>` : ''}
      ${cm.length ? html`<section class="fav-sec"><h2 class="section-h">Commands</h2><ul class="cmd-list">${cm.map(commandRow)}</ul></section>` : ''}
      ${sn.length ? html`<section class="fav-sec"><h2 class="section-h">Snippets</h2><div class="snip-grid">${sn.map((s) => snippetCard(s, { compact: true }))}</div></section>` : ''}
      ${bm.length ? html`<section class="fav-sec"><h2 class="section-h">Bookmarks</h2><ul class="rows">${bm.map(bookmarkRow)}</ul></section>` : ''}`);
    highlightWithin(page);
  });
  return () => { stop(); unbind(); };
}
