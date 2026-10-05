/** Full search page: everything, grouped by kind, with filters. */
import { html, render, raw, highlightText } from '../utils/html.js';
import { icon } from '../components/icons.js';
import { pageHeader, emptyState, KIND_ICONS, tagChips } from '../components/ui.js';
import { watch } from '../components/reactive.js';
import { searchService, KIND_LABELS } from '../services/searchService.js';
import { getPref } from '../utils/prefs.js';
import { debounce } from '../utils/dom.js';

export default function searchPage(el, { query }) {
  const state = { q: query.q || '', kind: '' };
  render(el, html`<div class="page">
    ${pageHeader({ title: 'Search', subtitle: 'Fuzzy search across everything you saved. Works offline.' })}
    <div class="bigsearch" role="search">${icon('search', { size: 20 })}
      <label class="visually-hidden" for="bigq">Search</label>
      <input id="bigq" class="bigsearch__input" type="search" value="${state.q}" placeholder="connection refused, #docker, type:bug, in:snippets…" autocomplete="off" spellcheck="false" autofocus>
    </div>
    <div class="chips" role="group" aria-label="Filter by kind"><button type="button" class="chip-btn is-on" aria-pressed="true" data-kind="">Everything</button>${Object.entries(KIND_LABELS).map(([k, v]) => html`<button type="button" class="chip-btn" aria-pressed="false" data-kind="${k}">${v}</button>`)}</div>
    <div data-results aria-live="polite"></div>
  </div>`);
  const results = el.querySelector('[data-results]');
  const input = el.querySelector('#bigq');

  const paint = () => {
    const q = state.q.trim();
    if (!q) {
      const recent = getPref('recentSearches') || [];
      render(results, html`${recent.length ? html`<section class="fav-sec"><h2 class="section-h">Recent searches</h2><div class="chips">${recent.map((r) => html`<button type="button" class="chip-btn" data-recent="${r}">${r}</button>`)}</div></section>` : ''}
        <section class="fav-sec"><h2 class="section-h">Search tips</h2><ul class="tips">
          <li><code>#docker</code> only items tagged docker</li><li><code>type:bug</code> only bugs</li>
          <li><code>in:snippets</code> only snippets (also commands, projects, bookmarks)</li><li><code>is:fav</code> only favorites</li>
          <li>Synonyms work: <code>postgres container</code> finds “PostgreSQL Docker”.</li></ul></section>`);
      return;
    }
    const all = searchService.search(q, { kinds: state.kind ? [state.kind] : [], limit: 120 });
    const groups = searchService.grouped(all);
    render(results, all.length ? html`<p class="result-count muted small">${all.length} result${all.length === 1 ? '' : 's'}</p>
      ${Object.entries(groups).map(([kind, items]) => html`<section class="fav-sec"><h2 class="section-h">${icon(KIND_ICONS[kind], { size: 15 })}${KIND_LABELS[kind]} <span class="muted">${items.length}</span></h2>
        <ul class="rows">${items.map((r) => html`<li class="row"><a class="row__main" href="${r.href}">
          <span class="row__title ${kind === 'command' ? 'mono' : ''}">${raw(highlightText(r.title, q))}</span>
          ${r.text ? html`<span class="row__summary">${raw(highlightText(r.text.slice(0, 160), q))}</span>` : ''}
          <span class="row__meta"><span class="meta-item">${r.subtitle}</span></span></a>
          <div class="row__side">${tagChips(r.tags, { max: 3 })}</div></li>`)}</ul></section>`)}`
      : emptyState({ iconName: 'search', title: `Nothing found for “${q}”`, text: 'Try fewer words, a tag like #python, or check the spelling. If you solve it, capture it — then it’ll be here next time.', action: html`<button type="button" class="btn btn--primary" data-capture>Capture it now</button>` }));
  };
  const record = debounce(() => { if (state.q.trim().length > 2) searchService.record(state.q, searchService.search(state.q, { limit: 10 })); }, 1500);
  const stop = watch(paint);
  input.addEventListener('input', debounce(() => {
    state.q = input.value;
    history.replaceState(null, '', `#/search${state.q ? `?q=${encodeURIComponent(state.q)}` : ''}`);
    paint(); record();
  }, 120));
  el.addEventListener('click', (e) => {
    const k = e.target.closest('[data-kind]');
    if (k) { state.kind = k.dataset.kind; el.querySelectorAll('[data-kind]').forEach((b) => { b.classList.toggle('is-on', b === k); b.setAttribute('aria-pressed', String(b === k)); }); paint(); }
    const r = e.target.closest('[data-recent]');
    if (r) { input.value = r.dataset.recent; state.q = r.dataset.recent; paint(); input.focus(); }
    if (e.target.closest('.row__main') && state.q.trim()) searchService.record(state.q, searchService.search(state.q, { limit: 10 }));
  });
  if (state.q) record();
  return () => { stop(); record.cancel(); };
}
