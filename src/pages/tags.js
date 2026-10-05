/** Tag index: every tag with counts; click to see everything tagged. */
import { html, render } from '../utils/html.js';
import { pageHeader, emptyState, skeletonList } from '../components/ui.js';
import { watch } from '../components/reactive.js';
import { techDisplay } from '../services/insightsService.js';

export default function tagsPage(el) {
  el.innerHTML = '<div class="page"></div>';
  const page = el.firstElementChild;
  return watch((d) => {
    if (!d.loaded.memories) { render(page, skeletonList(4)); return; }
    const counts = {};
    for (const k of ['memories', 'snippets', 'commands', 'bookmarks', 'projects']) for (const r of d[k]) for (const t of r.tags || []) counts[t] = (counts[t] || 0) + 1;
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    const max = entries[0]?.[1] || 1;
    render(page, html`${pageHeader({ title: 'Tags', subtitle: `${entries.length} tags across everything you saved.` })}
      ${entries.length ? html`<ul class="tag-cloud">${entries.map(([t, n]) => html`<li><a class="tag-cloud__item" style="--w:${0.4 + 0.6 * (n / max)}" href="#/search?q=${encodeURIComponent(`#${t}`)}"><span>#${t}</span><span class="tag-cloud__n">${n}</span></a>${techDisplay(t) !== t ? html`<span class="visually-hidden">${techDisplay(t)}</span>` : ''}</li>`)}</ul>`
        : emptyState({ iconName: 'tag', title: 'No tags yet', text: 'Tags are added automatically by Quick Capture, or by hand in any editor.' })}`);
  });
}
