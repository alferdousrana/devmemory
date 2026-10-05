/** My Developer Journey — a timeline of projects, fixes, technologies and snippets. */
import { html, render } from '../utils/html.js';
import { icon } from '../components/icons.js';
import { pageHeader, emptyState, skeletonList } from '../components/ui.js';
import { watch } from '../components/reactive.js';
import { journeyEvents } from '../services/insightsService.js';
import { formatDate, monthName } from '../utils/date.js';

const KIND_LABEL = { project: 'Project started', deploy: 'Project shipped', bug: 'Bug solved', learned: 'Technology learned', snippet: 'Snippet saved' };

export default function journeyPage(el) {
  let kind = '';
  el.innerHTML = '<div class="page page--narrow"></div>';
  const page = el.firstElementChild;
  const paint = (d) => {
    if (!d.loaded.memories) { render(page, skeletonList(5)); return; }
    const events = journeyEvents(d).filter((e) => !kind || e.kind === kind);
    const months = [];
    for (const e of events) {
      const label = monthName(e.at);
      let m = months.find((x) => x.label === label);
      if (!m) months.push((m = { label, items: [] }));
      m.items.push(e);
    }
    render(page, html`${pageHeader({ title: 'My developer journey', subtitle: 'What you started, shipped, solved and learned — in order.' })}
      <div class="chips" role="group" aria-label="Show"><button type="button" class="chip-btn ${!kind ? 'is-on' : ''}" aria-pressed="${!kind}" data-k="">Everything</button>${Object.entries(KIND_LABEL).map(([k, v]) => html`<button type="button" class="chip-btn ${kind === k ? 'is-on' : ''}" aria-pressed="${kind === k}" data-k="${k}">${v}</button>`)}</div>
      ${events.length ? html`<div class="journey">${months.map((m) => html`<section class="journey__month"><h2 class="journey__label">${m.label}</h2>
        <ol class="journey__list">${m.items.map((e) => html`<li class="journey__item journey__item--${e.kind}">
          <span class="journey__dot" aria-hidden="true">${icon(e.icon, { size: 13 })}</span>
          <div><a href="${e.href}" class="journey__title">${e.title}</a><p class="journey__meta muted small"><span>${KIND_LABEL[e.kind]}</span><time>${formatDate(e.at)}</time></p></div></li>`)}</ol></section>`)}</div>`
        : emptyState({ iconName: 'timeline', title: 'Your journey starts with one memory', text: 'Projects, solved bugs and new technologies appear here as you save them.' })}`);
  };
  const stop = watch(paint);
  page.addEventListener('click', (e) => { const b = e.target.closest('[data-k]'); if (b) { kind = b.dataset.k; import('../state/dataStore.js').then(({ dataStore }) => paint(dataStore.get())); } });
  return stop;
}
