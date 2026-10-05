/** Collections list and a single collection (mixed item types). */
import { html, render } from '../utils/html.js';
import { icon } from '../components/icons.js';
import { pageHeader, emptyState, skeletonList, typeBadge } from '../components/ui.js';
import { watch } from '../components/reactive.js';
import { openCollectionEditor } from '../components/editors.js';
import { collectionService } from '../services/collectionService.js';
import { runAction } from '../services/notify.js';
import { safeUrl } from '../utils/html.js';
import { KIND_ICONS } from '../components/ui.js';

const hrefFor = (kind, r) => ({
  memory: `#/memories/${r.id}`, snippet: `#/snippets?open=${r.id}`, command: `#/commands?open=${r.id}`,
  project: `#/projects/${r.id}`, bookmark: safeUrl(r.url),
}[kind]);
const titleFor = (kind, r) => (kind === 'command' ? r.command : kind === 'project' ? r.name : r.title);

export default function collectionsPage(el, { params }) {
  el.innerHTML = '<div class="page"></div>';
  const page = el.firstElementChild;

  const paintList = (d) => {
    render(page, html`${pageHeader({ title: 'Collections', subtitle: 'Group memories, snippets, commands, projects and links by theme.', actions: html`<button type="button" class="btn btn--primary" data-new>${icon('plus', { size: 16 })}New collection</button>` })}
      ${!d.loaded.collections ? skeletonList(4) : d.collections.length
        ? html`<ul class="col-grid">${d.collections.map((c) => {
          const kinds = {};
          for (const i of c.items || []) kinds[i.kind] = (kinds[i.kind] || 0) + 1;
          return html`<li><a class="col-card" href="#/collections/${c.id}"><span class="col-card__icon" aria-hidden="true">${c.icon}</span>
            <span class="col-card__name">${c.name}</span>${c.description ? html`<span class="col-card__desc">${c.description}</span>` : ''}
            <span class="col-card__kinds">${Object.entries(kinds).map(([k, n]) => html`<span class="meta-item">${icon(KIND_ICONS[k], { size: 12 })}${n}</span>`)}${!(c.items || []).length ? html`<span class="muted small">Empty</span>` : ''}</span></a></li>`;
        })}</ul>`
        : emptyState({ iconName: 'layers', title: 'No collections yet', text: 'Try “Interview preparation”, “Docker” or “University”. Add items from any memory, project or snippet.', action: html`<button type="button" class="btn btn--primary" data-new>New collection</button>` })}`);
  };

  const paintOne = (d) => {
    if (!d.loaded.collections) { render(page, skeletonList(4)); return; }
    const c = d.collections.find((x) => x.id === params.id);
    if (!c) { render(page, emptyState({ iconName: 'layers', title: 'This collection doesn’t exist', action: html`<a class="btn btn--ghost" href="#/collections">All collections</a>` })); return; }
    const items = collectionService.resolve(c);
    render(page, html`<nav class="crumbs" aria-label="Breadcrumb"><a href="#/collections">${icon('arrowLeft', { size: 14 })}Collections</a></nav>
      ${pageHeader({ title: html`<span aria-hidden="true">${c.icon}</span> ${c.name}`, subtitle: c.description, actions: html`<button type="button" class="btn btn--sm btn--ghost" data-edit>${icon('edit', { size: 15 })}Edit</button>` })}
      ${items.length ? html`<ul class="rows">${items.map(({ kind, record: r }) => html`<li class="row">
          <a class="row__main" href="${hrefFor(kind, r)}" ${kind === 'bookmark' ? html`target="_blank" rel="noopener noreferrer"` : ''}>
            <span class="row__title">${icon(KIND_ICONS[kind], { size: 15, className: 'inline-icon' })} ${titleFor(kind, r)}</span>
            <span class="row__meta">${kind === 'memory' ? typeBadge(r.type) : html`<span class="meta-item">${kind}</span>`}</span></a>
          <div class="row__side"><button type="button" class="icon-btn icon-btn--sm" data-remove="${kind}:${r.id}" aria-label="Remove from collection">${icon('x', { size: 15 })}</button></div>
        </li>`)}</ul>`
        : emptyState({ iconName: 'layers', title: 'This collection is empty', text: 'Open any memory, snippet or project and choose “Add to collection”.' })}`);
  };

  const stop = watch(params.id ? paintOne : paintList);
  page.addEventListener('click', (e) => {
    if (e.target.closest('[data-new]')) openCollectionEditor();
    if (e.target.closest('[data-edit]')) openCollectionEditor(collectionService.get(params.id));
    const rm = e.target.closest('[data-remove]');
    if (rm) { const [kind, id] = rm.dataset.remove.split(':'); runAction(() => collectionService.removeItem(params.id, kind, id)); }
  });
  return stop;
}
