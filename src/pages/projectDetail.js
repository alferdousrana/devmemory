/** Project Command Center — the project's brain. */
import { html, render, safeUrl } from '../utils/html.js';
import { icon } from '../components/icons.js';
import { emptyState, statusBadge, skeletonList, favButton } from '../components/ui.js';
import { memoryRow, commandRow, snippetCard, bookmarkRow } from '../components/items.js';
import { commandLine } from '../components/codeBlock.js';
import { highlightWithin } from '../components/codeHighlight.js';
import { watch } from '../components/reactive.js';
import { bindItemActions } from '../components/itemActions.js';
import { openProjectEditor, openCommandEditor, openSnippetEditor, openBookmarkEditor, openAddToCollection } from '../components/editors.js';
import { projectService } from '../services/projectService.js';

const TABS = [
  ['overview', 'Overview'], ['quickstart', 'Quick start'], ['architecture', 'Architecture'], ['commands', 'Commands'],
  ['bugs', 'Bugs'], ['snippets', 'Snippets'], ['memories', 'Memories'], ['bookmarks', 'Bookmarks'],
  ['deployment', 'Deployment'], ['environment', 'Environment'],
];

const prose = (text, empty) => (text ? html`<div class="prose">${String(text).split(/\n{2,}/).map((p) => html`<p>${p}</p>`)}</div>` : html`<p class="muted">${empty}</p>`);

export default function projectDetail(el, { params, query }) {
  let tab = TABS.some(([k]) => k === query.tab) ? query.tab : 'overview';
  el.innerHTML = '<div class="page page--wide"></div>';
  const page = el.firstElementChild;
  const unbind = bindItemActions(page);

  const quickContext = (p, ctx) => html`<section class="panel qc" aria-labelledby="qc-t">
    <h2 class="panel__title" id="qc-t">Project quick context</h2>
    <dl class="qc__grid">
      <div class="qc__cell qc__cell--stack"><dt>Stack</dt><dd>${(p.techStack || []).length ? html`<ul class="stack stack--col">${p.techStack.map((t) => html`<li class="stack__item">${t}</li>`)}</ul>` : html`<span class="muted">Not set</span>`}</dd></div>
      <div class="qc__cell"><dt>Run</dt><dd>${p.runCommand ? commandLine(p.runCommand) : html`<span class="muted">Not set</span>`}</dd>
        <dt>Backend</dt><dd>${p.backendCommand ? commandLine(p.backendCommand) : html`<span class="muted">Not set</span>`}</dd>
        <dt>Frontend</dt><dd>${p.frontendCommand ? commandLine(p.frontendCommand) : html`<span class="muted">Not set</span>`}</dd></div>
      <div class="qc__cell qc__nums">
        <a href="#/projects/${p.id}?tab=bugs" data-tab-link="bugs"><strong>${ctx.openBugs.length}</strong><span>open bug${ctx.openBugs.length === 1 ? '' : 's'}</span></a>
        <a href="#/projects/${p.id}?tab=bugs" data-tab-link="bugs"><strong>${ctx.bugs.length}</strong><span>recent bugs</span></a>
        <a href="#/projects/${p.id}?tab=memories" data-tab-link="memories"><strong>${ctx.importantMemories.length}</strong><span>important memories</span></a>
      </div>
    </dl>
  </section>`;

  const body = (p, ctx) => {
    switch (tab) {
      case 'overview': {
        const attention = projectService.attentionReasons(p);
        return html`${quickContext(p, ctx)}
          ${attention.length ? html`<aside class="notice notice--warn">${icon('alert', { size: 16 })}<div><strong>Needs attention:</strong> ${attention.join(', ')}.</div></aside>` : ''}
          <div class="dash-grid">
            <section class="panel"><h2 class="panel__title">About</h2>${prose(p.description, 'No description yet.')}
              ${p.database ? html`<p class="small"><strong>Database:</strong> ${p.database}</p>` : ''}
              ${p.knownBugs ? html`<p class="small"><strong>Known bugs:</strong> ${p.knownBugs}</p>` : ''}</section>
            <section class="panel"><div class="panel__head"><h2 class="panel__title">Latest memories</h2><button type="button" class="btn btn--link small" data-tab-link="memories">All</button></div>
              ${ctx.memories.length ? html`<ul class="rows rows--compact">${ctx.memories.slice(0, 5).map((m) => memoryRow(m))}</ul>` : html`<p class="muted small">No memories linked yet.</p>`}</section>
          </div>`;
      }
      case 'quickstart': {
        const cmds = [['Run everything', p.runCommand], ['Backend', p.backendCommand], ['Frontend', p.frontendCommand]].filter(([, c]) => c);
        return html`<section class="panel">${cmds.length || (p.importantCommands || []).length ? html`
          ${cmds.map(([label, c]) => html`<h3 class="mem__h">${label}</h3>${commandLine(c)}`)}
          ${(p.importantCommands || []).length ? html`<h3 class="mem__h">Important commands</h3><div class="cmdlines">${p.importantCommands.map((c) => commandLine(c))}</div>` : ''}`
          : html`<p class="muted">No run commands yet. Add them so you can start this project cold in a year.</p><button type="button" class="btn btn--ghost" data-edit>Add commands</button>`}</section>`;
      }
      case 'architecture': return html`<section class="panel">${prose(p.architecture, 'No architecture notes yet. Write down the big decisions and why.')}
        ${ctx.memories.filter((m) => m.type === 'ARCHITECTURE').length ? html`<h3 class="mem__h">Architecture decisions</h3><ul class="rows rows--compact">${ctx.memories.filter((m) => m.type === 'ARCHITECTURE').map((m) => memoryRow(m))}</ul>` : ''}</section>`;
      case 'commands': return html`<div class="panel__head"><span></span><button type="button" class="btn btn--sm btn--ghost" data-add-command>${icon('plus', { size: 14 })}Add command</button></div>
        ${ctx.commands.length ? html`<ul class="cmd-list">${ctx.commands.map(commandRow)}</ul>` : emptyState({ iconName: 'terminal', title: 'No commands linked to this project' })}`;
      case 'bugs': return html`<div class="panel__head"><span></span><a class="btn btn--sm btn--ghost" href="#/memories/new?type=BUG&project=${p.id}">${icon('bug', { size: 14 })}Log a bug</a></div>
        ${ctx.bugs.length ? html`<ul class="rows">${ctx.bugs.map((m) => memoryRow(m))}</ul>` : emptyState({ iconName: 'bug', title: 'No bugs logged for this project' })}`;
      case 'snippets': return html`<div class="panel__head"><span></span><button type="button" class="btn btn--sm btn--ghost" data-add-snippet>${icon('plus', { size: 14 })}Add snippet</button></div>
        ${ctx.snippets.length ? html`<div class="snip-grid">${ctx.snippets.map((s) => snippetCard(s))}</div>` : emptyState({ iconName: 'code', title: 'No snippets linked to this project' })}`;
      case 'memories': return html`<div class="panel__head"><span></span><a class="btn btn--sm btn--ghost" href="#/memories/new?project=${p.id}">${icon('plus', { size: 14 })}New memory</a></div>
        ${ctx.memories.length ? html`<ul class="rows">${ctx.memories.map((m) => memoryRow(m))}</ul>` : emptyState({ iconName: 'brain', title: 'No memories linked to this project' })}`;
      case 'bookmarks': return html`<div class="panel__head"><span></span><button type="button" class="btn btn--sm btn--ghost" data-add-bookmark>${icon('plus', { size: 14 })}Add bookmark</button></div>
        ${ctx.bookmarks.length ? html`<ul class="rows">${ctx.bookmarks.map(bookmarkRow)}</ul>` : emptyState({ iconName: 'bookmark', title: 'No bookmarks linked to this project' })}`;
      case 'deployment': return html`<section class="panel">${p.deployment ? html`<pre class="steps">${p.deployment}</pre>` : html`<p class="muted">No deployment steps yet. Future you will thank you.</p><button type="button" class="btn btn--ghost" data-edit>Add deployment steps</button>`}
        ${p.liveUrl ? html`<p><a class="link-ext" href="${safeUrl(p.liveUrl)}" target="_blank" rel="noopener noreferrer">${p.liveUrl}${icon('external', { size: 13 })}</a></p>` : ''}</section>`;
      case 'environment': return html`<section class="panel">${p.environment ? html`<pre class="steps mono">${p.environment}</pre>` : html`<p class="muted">No environment notes yet.</p>`}
        <p class="muted small">${icon('lock', { size: 13 })} Store variable names and where values come from — not real secrets.</p></section>`;
      default: return '';
    }
  };

  const paint = (d) => {
    if (!d.loaded.projects) { render(page, skeletonList(4)); return; }
    const p = d.projects.find((x) => x.id === params.id);
    if (!p) { render(page, emptyState({ iconName: 'folder', title: 'This project doesn’t exist', action: html`<a class="btn btn--ghost" href="#/projects">All projects</a>` })); return; }
    const ctx = projectService.context(p.id);
    const counts = { commands: ctx.commands.length, bugs: ctx.bugs.length, snippets: ctx.snippets.length, memories: ctx.memories.length, bookmarks: ctx.bookmarks.length };
    render(page, html`
      <nav class="crumbs" aria-label="Breadcrumb"><a href="#/projects">${icon('arrowLeft', { size: 14 })}Projects</a></nav>
      <header class="page-head">
        <div class="page-head__text">
          <h1 class="page-title" tabindex="-1">${p.name} ${statusBadge(p.status === 'active' ? '' : p.status)}</h1>
          <p class="page-sub proj-links">
            ${p.repoUrl ? html`<a class="link-ext" href="${safeUrl(p.repoUrl)}" target="_blank" rel="noopener noreferrer">${icon('code', { size: 14 })}Repository</a>` : ''}
            ${p.liveUrl ? html`<a class="link-ext" href="${safeUrl(p.liveUrl)}" target="_blank" rel="noopener noreferrer">${icon('globe', { size: 14 })}Live site</a>` : ''}
          </p>
        </div>
        <div class="page-head__actions">${favButton(p.isFavorite, html`data-fav-project="${p.id}"`)}
          <button type="button" class="btn btn--sm btn--ghost" data-collect>${icon('layers', { size: 15 })}Collect</button>
          <button type="button" class="btn btn--sm btn--ghost" data-edit>${icon('edit', { size: 15 })}Edit</button></div>
      </header>
      <div class="tabs" role="tablist" aria-label="Project sections">${TABS.map(([k, label]) => html`<button type="button" role="tab" id="tab-${k}" aria-controls="tabpanel" aria-selected="${k === tab}" tabindex="${k === tab ? 0 : -1}" class="tab ${k === tab ? 'is-on' : ''}" data-tab="${k}">${label}${counts[k] ? html`<span class="tab__n">${counts[k]}</span>` : ''}</button>`)}</div>
      <div id="tabpanel" role="tabpanel" aria-labelledby="tab-${tab}" class="tabpanel">${body(p, ctx)}</div>`);
    highlightWithin(page);
  };
  const stop = watch(paint);
  const repaint = () => import('../state/dataStore.js').then(({ dataStore }) => paint(dataStore.get()));
  const setTab = (k, focus) => { tab = k; history.replaceState(null, '', `#/projects/${params.id}?tab=${k}`); repaint().then(() => focus && page.querySelector(`[data-tab="${k}"]`)?.focus()); };

  page.addEventListener('click', (e) => {
    const p = projectService.get(params.id);
    const t = e.target.closest('[data-tab]');
    if (t) { setTab(t.dataset.tab, false); return; }
    const tl = e.target.closest('[data-tab-link]');
    if (tl) { e.preventDefault(); setTab(tl.dataset.tabLink, true); return; }
    if (!p) return;
    if (e.target.closest('[data-edit]')) openProjectEditor(p);
    else if (e.target.closest('[data-collect]')) openAddToCollection('project', p.id);
    else if (e.target.closest('[data-add-command]')) openCommandEditor(null, { projectId: p.id });
    else if (e.target.closest('[data-add-snippet]')) openSnippetEditor(null, { projectId: p.id });
    else if (e.target.closest('[data-add-bookmark]')) openBookmarkEditor(null, { projectId: p.id });
  });
  page.addEventListener('keydown', (e) => {
    const t = e.target.closest('[data-tab]');
    if (!t || !['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    const i = TABS.findIndex(([k]) => k === tab);
    const n = e.key === 'Home' ? 0 : e.key === 'End' ? TABS.length - 1 : (i + (e.key === 'ArrowRight' ? 1 : -1) + TABS.length) % TABS.length;
    setTab(TABS[n][0], true);
  });
  return () => { stop(); unbind(); };
}
