/** Projects list. */
import { html, render } from '../utils/html.js';
import { icon } from '../components/icons.js';
import { pageHeader, emptyState, skeletonCards } from '../components/ui.js';
import { projectCard } from '../components/items.js';
import { watch } from '../components/reactive.js';
import { openProjectEditor } from '../components/editors.js';
import { projectService } from '../services/projectService.js';
import { dataStore } from '../state/dataStore.js';

const ORDER = { active: 0, paused: 1, shipped: 2, archived: 3 };

export default function projectsPage(el, { query }) {
  let showArchived = false;
  render(el, html`<div class="page page--wide">
    ${pageHeader({ title: 'Projects', subtitle: 'Each project keeps its own stack, commands, bugs and decisions.', actions: html`<button type="button" class="btn btn--primary" data-new>${icon('plus', { size: 16 })}New project</button>` })}
    <div class="toolbar"><label class="check"><input type="checkbox" data-archived> Show archived</label></div>
    <div data-list></div>
  </div>`);
  const list = el.querySelector('[data-list]');
  const paint = (d) => {
    if (!d.loaded.projects) { render(list, skeletonCards(4)); return; }
    const items = d.projects.filter((p) => showArchived || p.status !== 'archived')
      .sort((a, b) => (ORDER[a.status] ?? 9) - (ORDER[b.status] ?? 9) || (b.isFavorite - a.isFavorite) || (b.updatedAt || 0) - (a.updatedAt || 0));
    render(list, items.length
      ? html`<div class="project-grid project-grid--page">${items.map((p) => {
        const ctx = projectService.context(p.id);
        return html`<div class="project-wrap">${projectCard(p, { attention: projectService.attentionReasons(p) })}
          <p class="project-wrap__counts muted small"><span>${ctx.memories.length} memories</span><span>${ctx.openBugs.length} open bugs</span><span>${ctx.commands.length} commands</span></p></div>`;
      })}</div>`
      : emptyState({ iconName: 'folder', title: 'No projects yet', text: 'A project collects its run commands, architecture, deployment steps and the bugs you hit while building it.', action: html`<button type="button" class="btn btn--primary" data-new>New project</button>` }));
  };
  const stop = watch(paint);
  el.querySelector('[data-archived]').addEventListener('change', (e) => { showArchived = e.target.checked; paint(dataStore.get()); });
  el.addEventListener('click', (e) => { if (e.target.closest('[data-new]')) openProjectEditor(); });
  if (query.new) { openProjectEditor(); history.replaceState(null, '', '#/projects'); }
  return stop;
}
