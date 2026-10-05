/** Dashboard — Overview and the denser Dev Command Center mode. */
import { html, render } from '../utils/html.js';
import { icon } from '../components/icons.js';
import { pageHeader, emptyState, typeBadge, statusBadge, timeAgo, skeletonList } from '../components/ui.js';
import { commandRow, snippetCard, projectCard } from '../components/items.js';
import { watch } from '../components/reactive.js';
import { bindItemActions } from '../components/itemActions.js';
import { highlightWithin } from '../components/codeHighlight.js';
import { stats, devBrief, memoryHealth, insightSentences } from '../services/insightsService.js';
import { projectService } from '../services/projectService.js';
import { effectiveStreak, ACTIVITY_ICONS } from '../services/activityService.js';
import { dueQueue } from '../utils/spacedRepetition.js';
import { greeting, dayLabel, timeOfDay, startOfDay } from '../utils/date.js';
import { getPref, setPref } from '../utils/prefs.js';
import { safeUrl } from '../utils/html.js';
import { modKey } from '../utils/dom.js';
import { dataStore } from '../state/dataStore.js';
import { authState } from '../state/authState.js';

function healthRing(score) {
  const r = 26; const c = 2 * Math.PI * r;
  const tone = score >= 80 ? 'good' : score >= 55 ? 'ok' : 'low';
  return html`<svg class="ring ring--${tone}" viewBox="0 0 64 64" width="64" height="64" aria-hidden="true">
    <circle cx="32" cy="32" r="${r}" class="ring__track"/><circle cx="32" cy="32" r="${r}" class="ring__value" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - score / 100)}"/>
    <text x="32" y="37" text-anchor="middle">${score}</text></svg>`;
}

function activityFeed(activity) {
  const recent = activity.slice(0, 14);
  if (!recent.length) return html`<p class="muted small">Your activity shows up here as you save and review.</p>`;
  const groups = [];
  for (const a of recent) {
    const key = startOfDay(a.createdAt);
    let g = groups.find((x) => x.key === key);
    if (!g) groups.push((g = { key, items: [] }));
    g.items.push(a);
  }
  const hrefFor = (a) => ({ memory: `#/memories/${a.refId}`, project: `#/projects/${a.refId}`, snippet: `#/snippets?open=${a.refId}`, command: `#/commands?open=${a.refId}` }[a.refType] || null);
  return html`${groups.map((g) => html`<div class="feed">
    <h3 class="feed__day">${dayLabel(g.key)}</h3>
    <ol class="feed__list">${g.items.map((a) => {
      const href = hrefFor(a);
      return html`<li class="feed__item"><span class="feed__time">${timeOfDay(a.createdAt)}</span><span class="feed__icon">${icon(ACTIVITY_ICONS[a.type] || 'spark', { size: 14 })}</span>${href ? html`<a href="${href}">${a.message}</a>` : html`<span>${a.message}</span>`}</li>`;
    })}</ol></div>`)}`;
}

function statStrip(s) {
  const items = [
    ['Total memories', s.totalMemories, '#/memories'], ['Errors solved', s.errorsSolved, '#/errors'],
    ['Snippets', s.snippets, '#/snippets'], ['Commands', s.commands, '#/commands'],
    ['Projects', s.projects, '#/projects'], ['Review queue', s.reviewQueue, '#/review'],
  ];
  return html`<ul class="stat-strip">${items.map(([label, n, href]) => html`<li><a href="${href}"><span class="stat-strip__n">${n}</span><span class="stat-strip__label">${label}</span></a></li>`)}</ul>`;
}

function briefCard(b) {
  const rows = [
    [b.toReview, `memor${b.toReview === 1 ? 'y' : 'ies'} to review`, '#/review', 'repeat'],
    [b.unresolvedBugs, `unresolved bug${b.unresolvedBugs === 1 ? '' : 's'}`, '#/errors?status=open', 'bug'],
    [b.projectsNeedingAttention.length, `project${b.projectsNeedingAttention.length === 1 ? ' needs' : 's need'} attention`, b.projectsNeedingAttention[0] ? `#/projects/${b.projectsNeedingAttention[0].id}` : '#/projects', 'folder'],
    [b.frequentCommands.length, `frequently used command${b.frequentCommands.length === 1 ? '' : 's'}`, '#/commands?sort=used', 'terminal'],
  ];
  return html`<section class="panel brief" aria-labelledby="brief-t">
    <h2 class="panel__title" id="brief-t">Your dev brief</h2>
    <ul class="brief__list">${rows.map(([n, label, href, ic]) => html`<li><a href="${href}" class="${n ? '' : 'is-zero'}">${icon(ic, { size: 15 })}<strong>${n}</strong><span>${label}</span></a></li>`)}</ul>
    ${b.recentTopic ? html`<p class="brief__topic">Recent topic <a class="tag" href="#/search?q=${encodeURIComponent(b.recentTopic)}">${b.recentTopic}</a></p>` : ''}
  </section>`;
}

function healthCard(h) {
  return html`<section class="panel health" aria-labelledby="health-t">
    <div class="health__head">${healthRing(h.score)}<div><h2 class="panel__title" id="health-t">Memory health</h2><p class="muted small">How findable and fresh your memories are.</p></div></div>
    ${h.suggestions.length ? html`<ul class="suggest">${h.suggestions.slice(0, 4).map((s) => html`<li><a href="${s.href}">${s.text}${icon('chevronRight', { size: 14 })}</a></li>`)}</ul>` : html`<p class="muted small">Nothing to fix. Nice.</p>`}
  </section>`;
}

function overview(d, a) {
  const s = stats(d);
  const brief = devBrief(d, { projectAttention: (p) => projectService.attentionReasons(p) });
  const health = memoryHealth(d);
  const insights = insightSentences(d, { searchTopicCounts: getPref('searchTopicCounts') });
  return html`
    ${statStrip(s)}
    <div class="dash-grid">
      <div class="dash-col">
        ${briefCard(brief)}
        <section class="panel" aria-labelledby="act-t"><div class="panel__head"><h2 class="panel__title" id="act-t">Recent activity</h2><a class="small" href="#/journey">Journey</a></div>${activityFeed(d.activity)}</section>
      </div>
      <div class="dash-col">
        ${healthCard(health)}
        ${insights.length ? html`<section class="panel" aria-labelledby="ins-t"><div class="panel__head"><h2 class="panel__title" id="ins-t">Developer insights</h2><a class="small" href="#/insights">Monthly recap</a></div>
          <ul class="insights">${insights.map((x) => html`<li>${x}</li>`)}</ul></section>` : ''}
      </div>
    </div>`;
}

function commandCenter(d) {
  const due = dueQueue(d.memories);
  const openBugs = d.memories.filter((m) => m.type === 'BUG' && m.status !== 'resolved');
  const recentErrors = d.memories.filter((m) => m.type === 'BUG').slice(0, 5);
  const frequent = [...d.commands].sort((x, y) => (y.copyCount || 0) - (x.copyCount || 0)).slice(0, 4);
  const projects = d.projects.filter((p) => p.status !== 'archived').slice(0, 4);
  const snippets = [...d.snippets].sort((x, y) => (y.isFavorite - x.isFavorite) || (y.copyCount || 0) - (x.copyCount || 0)).slice(0, 2);
  const bookmarks = d.bookmarks.slice(0, 5);
  const insights = insightSentences(d, { searchTopicCounts: getPref('searchTopicCounts') });
  const focus = [...openBugs.slice(0, 2).map((m) => ({ m, why: 'Open bug' })), ...due.slice(0, 3).map((m) => ({ m, why: 'Due for review' }))];
  const memLink = (m) => html`<li><a href="#/memories/${m.id}"><span class="cc__t">${m.title}</span>${statusBadge(m.status)}</a></li>`;
  return html`<div class="cc">
    <section class="panel cc__focus"><h2 class="panel__title">Today’s focus</h2>
      ${focus.length ? html`<ul class="cc__list">${focus.map(({ m, why }) => html`<li><a href="#/memories/${m.id}"><span class="cc__t">${m.title}</span><span class="muted small">${why}</span></a></li>`)}</ul>` : html`<p class="muted small">Nothing urgent. Capture something new or browse your projects.</p>`}
    </section>
    <section class="panel"><div class="panel__head"><h2 class="panel__title">Recent errors</h2><a class="small" href="#/errors">All</a></div>
      ${recentErrors.length ? html`<ul class="cc__list">${recentErrors.map(memLink)}</ul>` : html`<p class="muted small">No bugs saved yet.</p>`}</section>
    <section class="panel"><div class="panel__head"><h2 class="panel__title">Review queue</h2><a class="btn btn--tiny btn--primary" href="#/review">Start</a></div>
      ${due.length ? html`<ul class="cc__list">${due.slice(0, 5).map((m) => html`<li><a href="#/memories/${m.id}"><span class="cc__t">${m.title}</span>${timeAgo(m.nextReviewAt)}</a></li>`)}</ul>` : html`<p class="muted small">You’re all caught up.</p>`}</section>
    <section class="panel cc__wide"><div class="panel__head"><h2 class="panel__title">Quick commands</h2><a class="small" href="#/commands">All</a></div>
      ${frequent.length ? html`<ul class="cmd-list cmd-list--compact">${frequent.map(commandRow)}</ul>` : html`<p class="muted small">Save commands you keep looking up.</p>`}</section>
    <section class="panel cc__wide"><div class="panel__head"><h2 class="panel__title">Recent projects</h2><a class="small" href="#/projects">All</a></div>
      ${projects.length ? html`<div class="project-grid">${projects.map((p) => projectCard(p, { attention: projectService.attentionReasons(p) }))}</div>` : html`<p class="muted small">No projects yet.</p>`}</section>
    <section class="panel cc__wide"><div class="panel__head"><h2 class="panel__title">Useful snippets</h2><a class="small" href="#/snippets">All</a></div>
      ${snippets.length ? html`<div class="snip-grid">${snippets.map((s) => snippetCard(s, { compact: true }))}</div>` : html`<p class="muted small">No snippets yet.</p>`}</section>
    <section class="panel"><div class="panel__head"><h2 class="panel__title">Bookmarks</h2><a class="small" href="#/bookmarks">All</a></div>
      ${bookmarks.length ? html`<ul class="cc__list">${bookmarks.map((b) => html`<li><a href="${safeUrl(b.url)}" target="_blank" rel="noopener noreferrer"><span class="cc__t">${b.title}</span>${icon('external', { size: 13 })}</a></li>`)}</ul>` : html`<p class="muted small">No bookmarks yet.</p>`}</section>
    <section class="panel"><div class="panel__head"><h2 class="panel__title">Developer insights</h2><a class="small" href="#/insights">More</a></div>
      ${insights.length ? html`<ul class="insights">${insights.slice(0, 4).map((x) => html`<li>${x}</li>`)}</ul>` : html`<p class="muted small">Insights appear once you’ve saved a few memories.</p>`}</section>
  </div>`;
}

function firstRun() {
  return emptyState({
    iconName: 'brain',
    title: 'Your developer brain is empty — for now',
    text: `Next time you fix something, press ${modKey()} + Shift + M and describe it in one sentence. DevMemory structures it for you.`,
    action: html`<button type="button" class="btn btn--primary" data-capture>${icon('zap', { size: 15 })}Capture your first memory</button>
      <a class="btn btn--ghost" href="#/projects?new=1">${icon('folder', { size: 15 })}Add a project</a>`,
  });
}

export default function dashboard(el, { props }) {
  let mode = getPref('dashboardMode') || 'overview';
  el.innerHTML = '<div class="page page--wide"></div>';
  const page = el.firstElementChild;
  const unbind = bindItemActions(page);

  const paint = (d, a) => {
    const first = (a.profile?.displayName || a.currentUser?.displayName || 'there').split(' ')[0];
    const streak = effectiveStreak(a.profile);
    const loading = !d.loaded.memories;
    const empty = !loading && !d.memories.length && !d.snippets.length && !d.commands.length && !d.projects.length;
    render(page, html`
      ${pageHeader({
        title: html`${greeting()}, ${first} 👋`,
        subtitle: 'Here’s what your developer brain looks like today.',
        actions: html`${streak ? html`<span class="streak-pill" title="Days in a row you saved or reviewed something">🔥 ${streak} day streak</span>` : ''}
          <div class="seg" role="group" aria-label="Dashboard view">
            <button type="button" class="seg__btn ${mode === 'overview' ? 'is-on' : ''}" aria-pressed="${mode === 'overview'}" data-mode="overview">Overview</button>
            <button type="button" class="seg__btn ${mode === 'center' ? 'is-on' : ''}" aria-pressed="${mode === 'center'}" data-mode="center">Command center</button>
          </div>`,
      })}
      ${loading ? skeletonList(6) : empty ? firstRun() : mode === 'center' ? commandCenter(d) : overview(d, a)}`);
    highlightWithin(page);
  };
  const stop = watch(paint, { auth: true });

  page.addEventListener('click', (e) => {
    const m = e.target.closest('[data-mode]');
    if (m) { mode = m.dataset.mode; setPref('dashboardMode', mode); paint(dataStore.get(), authState.get()); page.querySelector(`[data-mode="${mode}"]`)?.focus(); }
  });

  if (props.capture) import('../components/quickCapture.js').then((q) => q.openQuickCapture());
  return () => { stop(); unbind(); };
}
