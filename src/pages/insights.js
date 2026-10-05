/** Insights: monthly recap, developer insights, memory health with duplicates. */
import { html, render } from '../utils/html.js';
import { icon } from '../components/icons.js';
import { pageHeader, skeletonList } from '../components/ui.js';
import { watch } from '../components/reactive.js';
import { monthlySummary, insightSentences, memoryHealth, mostUsedTechnology } from '../services/insightsService.js';
import { memoryService } from '../services/memoryService.js';
import { runAction, toast } from '../services/notify.js';
import { confirmDialog } from '../components/modal.js';
import { getPref } from '../utils/prefs.js';
import { monthName } from '../utils/date.js';

export default function insightsPage(el) {
  let monthOffset = 0;
  el.innerHTML = '<div class="page"></div>';
  const page = el.firstElementChild;
  const paint = (d) => {
    if (!d.loaded.memories) { render(page, skeletonList(5)); return; }
    const now = new Date();
    const ref = new Date(now.getFullYear(), now.getMonth() + monthOffset, 15).getTime();
    const prefs = { searchTopicCounts: getPref('searchTopicCounts') };
    const s = monthlySummary(d, prefs, ref);
    const health = memoryHealth(d);
    const insights = insightSentences(d, prefs);
    const top = mostUsedTechnology(d);
    render(page, html`${pageHeader({ title: 'Insights', subtitle: 'Computed on your device from your own data.' })}
      <section class="recap" aria-labelledby="recap-t">
        <div class="recap__head">
          <h2 class="recap__title" id="recap-t">What I learned in ${monthName(ref)}</h2>
          <div class="seg" role="group" aria-label="Month"><button type="button" class="seg__btn" data-month="-1" aria-label="Previous month">${icon('chevronLeft', { size: 15 })}</button><button type="button" class="seg__btn" data-month="1" aria-label="Next month" ${monthOffset >= 0 ? 'disabled' : ''}>${icon('chevronRight', { size: 15 })}</button></div>
        </div>
        ${s.memoriesSaved || s.bugsSolved || s.snippetsSaved ? html`
        <p class="recap__lead">${s.learnedTopics.length ? html`You learned <strong>${s.learnedTopics.slice(0, 3).join(', ')}</strong>${s.learnedTopics.length > 3 ? html` and ${s.learnedTopics.length - 3} more topics` : ''}.` : 'A quieter month.'}</p>
        <dl class="recap__facts">
          <div><dt>Bugs solved</dt><dd>${s.bugsSolved}</dd></div>
          <div><dt>Memories saved</dt><dd>${s.memoriesSaved}</dd></div>
          <div><dt>Technologies</dt><dd>${s.technologiesCount}</dd></div>
          <div><dt>Reviews</dt><dd>${s.reviews}</dd></div>
        </dl>
        <ul class="recap__notes">
          ${s.topTechnology ? html`<li>Top technology: <strong>${s.topTechnology}</strong></li>` : ''}
          ${s.mostActiveProject ? html`<li>Most active project: <strong>${s.mostActiveProject}</strong></li>` : ''}
          ${s.mostSearched ? html`<li>Most searched topic: <strong>${s.mostSearched}</strong></li>` : ''}
          ${s.snippetsSaved || s.commandsSaved ? html`<li>Also saved ${s.snippetsSaved} snippet${s.snippetsSaved === 1 ? '' : 's'} and ${s.commandsSaved} command${s.commandsSaved === 1 ? '' : 's'}.</li>` : ''}
        </ul>` : html`<p class="muted">Nothing saved in ${monthName(ref)}.</p>`}
      </section>

      <div class="dash-grid">
        <section class="panel" aria-labelledby="h-t">
          <h2 class="panel__title" id="h-t">Memory health: ${health.score}%</h2>
          <ul class="bars">${health.parts.map((p) => html`<li><span class="bars__label">${p.label}</span><span class="bars__track"><span style="width:${Math.round(Math.max(0, p.value) * 100)}%"></span></span><span class="bars__n">${Math.round(Math.max(0, p.value) * 100)}%</span></li>`)}</ul>
          ${health.suggestions.length ? html`<h3 class="mem__h">Suggestions</h3><ul class="suggest">${health.suggestions.map((x) => html`<li><a href="${x.href}">${x.text}${icon('chevronRight', { size: 14 })}</a></li>`)}</ul>` : ''}
        </section>
        <section class="panel" aria-labelledby="i-t">
          <h2 class="panel__title" id="i-t">Developer insights</h2>
          ${insights.length ? html`<ul class="insights">${insights.map((x) => html`<li>${x}</li>`)}</ul>` : html`<p class="muted small">Save a few memories to see patterns.</p>`}
          ${top ? html`<p class="small muted">Across all time, ${top.name} appears in ${top.count} saved items.</p>` : ''}
        </section>
      </div>

      <section class="panel" id="duplicates" aria-labelledby="d-t">
        <h2 class="panel__title" id="d-t">Possible duplicates</h2>
        ${health.duplicatePairs.length ? html`<ul class="dupe-pairs">${health.duplicatePairs.slice(0, 20).map((p) => html`<li>
          <a href="#/memories/${p.a.id}">${p.a.title}</a><span class="muted small">${Math.round(p.score * 100)}% similar</span><a href="#/memories/${p.b.id}">${p.b.title}</a>
          <button type="button" class="btn btn--tiny btn--ghost" data-merge="${p.a.id}:${p.b.id}">${icon('merge', { size: 13 })}Merge</button></li>`)}</ul>`
          : html`<p class="muted small">No duplicates found.</p>`}
      </section>`);
    if (location.hash.includes('#duplicates')) page.querySelector('#duplicates')?.scrollIntoView();
  };
  const stop = watch(paint);
  page.addEventListener('click', async (e) => {
    const m = e.target.closest('[data-month]');
    if (m && !m.disabled) { monthOffset += Number(m.dataset.month); import('../state/dataStore.js').then(({ dataStore }) => paint(dataStore.get())); }
    const mg = e.target.closest('[data-merge]');
    if (mg) {
      const [keep, drop] = mg.dataset.merge.split(':');
      const a = memoryService.get(keep); const b = memoryService.get(drop);
      if (!a || !b) return;
      if (await confirmDialog({ title: 'Merge these memories?', message: `“${b.title}” will be merged into “${a.title}” and then deleted. You can undo the delete right after.`, confirmLabel: 'Merge' })) {
        runAction(() => { memoryService.merge(keep, b); memoryService.remove(drop); toast('Merged ✓', { type: 'success' }); });
      }
    }
  });
  return stop;
}
