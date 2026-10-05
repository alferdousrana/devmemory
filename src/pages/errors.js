/** Error Vault — bugs with error messages, environment, root cause and fix. */
import { html, render, raw, highlightText } from '../utils/html.js';
import { icon } from '../components/icons.js';
import { pageHeader, emptyState, skeletonList, tagChips, timeAgo, favButton } from '../components/ui.js';
import { watch } from '../components/reactive.js';
import { bindItemActions } from '../components/itemActions.js';
import { memoryService } from '../services/memoryService.js';
import { searchService } from '../services/searchService.js';
import { runAction } from '../services/notify.js';
import { dataStore } from '../state/dataStore.js';
import { BUG_STATUSES } from '../data/schema.js';
import { debounce } from '../utils/dom.js';

const TABS = { open: 'Open', resolved: 'Resolved', all: 'All' };
const STATUS_LABEL = { unresolved: 'Unresolved', investigating: 'Investigating', resolved: 'Resolved' };

function errorCard(m, q, projectName) {
  return html`<article class="err status-edge--${m.status}">
    <header class="err__head">
      <a class="err__title" href="#/memories/${m.id}">${raw(highlightText(m.title, q))}</a>
      <span class="err__tools">
        <label class="visually-hidden" for="st-${m.id}">Status</label>
        <select id="st-${m.id}" class="status-select status-select--${m.status}" data-status="${m.id}">${BUG_STATUSES.map((s) => html`<option value="${s}" ${s === m.status ? 'selected' : ''}>${STATUS_LABEL[s]}</option>`)}</select>
        ${favButton(m.isFavorite, html`data-fav-memory="${m.id}"`)}
      </span>
    </header>
    ${m.errorMessage ? html`<pre class="err__msg"><code>${m.errorMessage}</code></pre>` : ''}
    <dl class="err__facts">
      ${m.rootCause ? html`<div><dt>Root cause</dt><dd>${m.rootCause}</dd></div>` : ''}
      ${m.solution ? html`<div><dt>Fix</dt><dd>${m.solution}</dd></div>` : html`<div><dt>Fix</dt><dd class="muted">Not solved yet</dd></div>`}
    </dl>
    <footer class="row__meta">${m.environment ? html`<span class="meta-item">${icon('terminal', { size: 12 })}${m.environment}</span>` : ''}${projectName ? html`<span class="meta-item">${icon('folder', { size: 12 })}${projectName}</span>` : ''}${(m.commands || []).length ? html`<span class="meta-item">${m.commands.length} command${m.commands.length > 1 ? 's' : ''}</span>` : ''}${timeAgo(m.updatedAt || m.createdAt)}${tagChips(m.tags, { max: 4 })}</footer>
  </article>`;
}

export default function errorsPage(el, { query }) {
  const state = { tab: TABS[query.status] ? query.status : 'open', q: '', project: '' };
  render(el, html`<div class="page">
    ${pageHeader({ title: 'Errors & fixes', subtitle: 'Every error you’ve hit, why it happened, and how you fixed it.', actions: html`<a class="btn btn--primary" href="#/memories/new?type=BUG">${icon('bug', { size: 16 })}New bug</a>` })}
    <div class="toolbar">
      <div class="seg" role="tablist" aria-label="Status">${Object.entries(TABS).map(([k, v]) => html`<button type="button" role="tab" class="seg__btn ${k === state.tab ? 'is-on' : ''}" aria-selected="${k === state.tab}" data-tab="${k}">${v}<span class="seg__n" data-n="${k}"></span></button>`)}</div>
      <label class="toolbar__search">${icon('search', { size: 16 })}<span class="visually-hidden">Search errors</span><input class="input input--bare" data-q placeholder="Search error messages, causes, fixes…" autocomplete="off"></label>
      <label><span class="visually-hidden">Project</span><select class="input input--sm" data-project><option value="">All projects</option>${dataStore.get().projects.map((p) => html`<option value="${p.id}">${p.name}</option>`)}</select></label>
    </div>
    <div data-list></div>
  </div>`);
  const list = el.querySelector('[data-list]');
  const unbind = bindItemActions(el);

  const paint = (d) => {
    if (!d.loaded.memories) { render(list, skeletonList(5)); return; }
    const bugs = d.memories.filter((m) => m.type === 'BUG');
    const counts = { open: bugs.filter((b) => b.status !== 'resolved').length, resolved: bugs.filter((b) => b.status === 'resolved').length, all: bugs.length };
    for (const [k, n] of Object.entries(counts)) { const s = el.querySelector(`[data-n="${k}"]`); if (s) s.textContent = n; }
    let items = bugs;
    if (state.q.trim()) {
      const ids = new Set(searchService.search(state.q, { kinds: ['memory'], limit: 500 }).map((r) => r.id));
      items = items.filter((m) => ids.has(m.id) || (m.errorMessage || '').toLowerCase().includes(state.q.toLowerCase()));
    }
    items = items.filter((m) => (state.tab === 'all' || (state.tab === 'open' ? m.status !== 'resolved' : m.status === 'resolved'))
      && (!state.project || m.projectId === state.project));
    const pname = (id) => d.projects.find((p) => p.id === id)?.name;
    render(list, items.length
      ? html`<div class="err-list">${items.map((m) => errorCard(m, state.q, pname(m.projectId)))}</div>`
      : bugs.length
        ? emptyState({ iconName: state.tab === 'open' ? 'check' : 'filter', title: state.tab === 'open' ? 'No open bugs' : 'Nothing matches', text: state.tab === 'open' ? 'Everything you’ve logged is resolved.' : '' })
        : emptyState({ iconName: 'bug', title: 'Your error vault is empty', text: 'Next time something breaks, save the error message and the fix. Future you will search for it.', action: html`<a class="btn btn--primary" href="#/memories/new?type=BUG">Log a bug</a>` }));
  };
  const stop = watch(paint);
  const repaint = () => paint(dataStore.get());
  el.querySelector('[data-q]').addEventListener('input', debounce((e) => { state.q = e.target.value; repaint(); }, 150));
  el.querySelector('[data-project]').addEventListener('change', (e) => { state.project = e.target.value; repaint(); });
  el.addEventListener('click', (e) => {
    const t = e.target.closest('[data-tab]');
    if (t) {
      state.tab = t.dataset.tab;
      el.querySelectorAll('[data-tab]').forEach((b) => { b.classList.toggle('is-on', b === t); b.setAttribute('aria-selected', String(b === t)); });
      repaint();
    }
  });
  el.addEventListener('change', (e) => {
    const s = e.target.closest('[data-status]');
    if (s) runAction(() => memoryService.setStatus(s.dataset.status, s.value)).then(repaint);
  });
  return () => { stop(); unbind(); };
}
