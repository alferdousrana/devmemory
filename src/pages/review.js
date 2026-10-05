/** Daily review session (spaced repetition). Space = reveal, 1–4 = rate, F = forgot. */
import { html, render } from '../utils/html.js';
import { icon } from '../components/icons.js';
import { pageHeader, emptyState, typeBadge, skeletonList } from '../components/ui.js';
import { commandLine } from '../components/codeBlock.js';
import { reviewService } from '../services/reviewService.js';
import { memoryService } from '../services/memoryService.js';
import { reportError, toast } from '../services/notify.js';
import { dataStore } from '../state/dataStore.js';
import { schedule, describeInterval } from '../utils/spacedRepetition.js';
import { isTypingTarget } from '../utils/dom.js';

const RATINGS = [['again', '😵', 'Again'], ['hard', '😐', 'Hard'], ['good', '🙂', 'Good'], ['easy', '😎', 'Easy']];

export default function reviewPage(el, { query }) {
  el.innerHTML = '<div class="page page--narrow"></div>';
  const page = el.firstElementChild;
  let queue = null;
  let index = 0;
  let revealed = false;
  let done = 0;
  let demoWarned = false;

  const build = () => {
    const due = reviewService.queue();
    if (query.focus) {
      const m = memoryService.get(query.focus);
      if (m) return [m, ...due.filter((x) => x.id !== m.id)];
    }
    return due;
  };

  const paint = () => {
    const d = dataStore.get();
    if (!d.loaded.memories) { render(page, skeletonList(3)); return; }
    if (!queue) queue = build();
    const m = queue[index];
    const header = pageHeader({ title: 'Review', subtitle: queue.length ? `${Math.min(index + 1, queue.length)} of ${queue.length}` : '' });
    if (!m) {
      const next = d.memories.filter((x) => x.nextReviewAt && x.nextReviewAt > Date.now()).sort((a, b) => a.nextReviewAt - b.nextReviewAt)[0];
      render(page, html`${header}${emptyState({
        iconName: 'check',
        title: done ? `Done — ${done} reviewed` : 'You’re all caught up',
        text: next ? `Next memory comes up ${new Date(next.nextReviewAt).toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' })}.` : 'New memories join the queue a day after you save them.',
        action: html`<a class="btn btn--ghost" href="#/dashboard">Back to dashboard</a>`,
      })}`);
      return;
    }
    const prompt = reviewService.promptFor(m);
    const preview = Object.fromEntries(RATINGS.map(([r]) => [r, describeInterval(schedule(m, r).intervalDays)]));
    render(page, html`${header}
      <div class="progress" role="progressbar" aria-label="Review progress" aria-valuemin="0" aria-valuemax="${queue.length}" aria-valuenow="${index}"><span style="width:${(index / queue.length) * 100}%"></span></div>
      <article class="flash" aria-live="polite">
        <div class="flash__q">
          <p class="flash__prompt">${prompt.q}</p>
          <h2 class="flash__subject">“${prompt.subject}”</h2>
          <div class="flash__meta">${typeBadge(m.type)}${(m.tags || []).slice(0, 3).map((t) => html`<span class="tag">#${t}</span>`)}</div>
        </div>
        ${revealed ? html`<div class="flash__a">
          ${m.rootCause ? html`<p class="flash__label">Root cause</p><p>${m.rootCause}</p>` : ''}
          ${m.solution ? html`<p class="flash__label">${m.type === 'BUG' ? 'Solution' : 'Key takeaway'}</p><p>${m.solution}</p>` : ''}
          ${!m.solution && !m.rootCause ? html`<p>${m.content || m.problem || 'No answer saved yet — edit this memory to add one.'}</p>` : ''}
          ${(m.commands || []).length ? html`<div class="cmdlines">${m.commands.slice(0, 3).map((c) => commandLine(c))}</div>` : ''}
          <a class="small" href="#/memories/${m.id}">Open full memory</a>
        </div>
        <div class="flash__rate">
          <p class="flash__ask">How well did you remember?</p>
          <div class="rate">${RATINGS.map(([r, emoji, label], i) => html`<button type="button" class="rate__btn rate__btn--${r}" data-rate="${r}"><span class="rate__emoji" aria-hidden="true">${emoji}</span><span class="rate__label">${label}</span><span class="rate__next">${preview[r]}</span><kbd>${i + 1}</kbd></button>`)}</div>
        </div>` : html`<div class="flash__reveal"><button type="button" class="btn btn--primary btn--lg" data-reveal autofocus>${icon('eye', { size: 17 })}Reveal answer <kbd>Space</kbd></button></div>`}
        <footer class="flash__foot"><button type="button" class="btn btn--link" data-forgot>I forgot this <kbd>F</kbd></button><button type="button" class="btn btn--link" data-skip>Skip</button></footer>
      </article>`);
    (page.querySelector('[data-reveal]') || page.querySelector('[data-rate="good"]'))?.focus({ preventScroll: true });
  };

  const advance = () => { index++; revealed = false; paint(); };
  const rate = (r) => {
    const m = queue[index];
    try { reviewService.rate(m.id, r); done++; }
    catch (err) {
      if (err.code === 'demo/read-only') { if (!demoWarned) { toast('Demo: ratings aren’t saved. Create an account to keep your schedule.', { type: 'info' }); demoWarned = true; } }
      else { reportError(err); return; }
    }
    if (r === 'again') queue.push(m); // see it again at the end of this session
    advance();
  };
  const forgot = () => {
    const m = queue[index];
    try { reviewService.forgot(m.id); } catch (err) { if (err.code !== 'demo/read-only') { reportError(err); return; } }
    queue.push(m);
    advance();
  };

  page.addEventListener('click', (e) => {
    if (e.target.closest('[data-reveal]')) { revealed = true; paint(); }
    const r = e.target.closest('[data-rate]');
    if (r) rate(r.dataset.rate);
    if (e.target.closest('[data-forgot]')) forgot();
    if (e.target.closest('[data-skip]')) advance();
  });
  const onKey = (e) => {
    if (isTypingTarget(e.target) || document.body.classList.contains('has-modal') || e.metaKey || e.ctrlKey || e.altKey) return;
    if (!queue || !queue[index]) return;
    if (e.key === ' ' && !revealed) { e.preventDefault(); revealed = true; paint(); }
    else if (revealed && ['1', '2', '3', '4'].includes(e.key)) rate(RATINGS[Number(e.key) - 1][0]);
    else if (e.key.toLowerCase() === 'f') forgot();
  };
  document.addEventListener('keydown', onKey);
  paint();
  const unsub = dataStore.subscribe((s) => { if (!queue && s.loaded.memories) paint(); });
  return () => { document.removeEventListener('keydown', onKey); unsub(); };
}
