/** One memory: everything you saved, review controls, related memories. */
import { html, render, safeUrl } from '../utils/html.js';
import { icon } from '../components/icons.js';
import { typeBadge, statusBadge, tagChips, emptyState, timeAgo, favButton, skeletonList } from '../components/ui.js';
import { codeBlock, commandLine } from '../components/codeBlock.js';
import { highlightWithin } from '../components/codeHighlight.js';
import { watch } from '../components/reactive.js';
import { confirmDialog, openModal } from '../components/modal.js';
import { memoryService } from '../services/memoryService.js';
import { reviewService } from '../services/reviewService.js';
import { collectionService } from '../services/collectionService.js';
import { attachmentService } from '../services/attachmentService.js';
import { aiService } from '../services/ai/aiService.js';
import { runAction, toast } from '../services/notify.js';
import { formatDate, relativeTime } from '../utils/date.js';
import { describeInterval, currentIntervalDays } from '../utils/spacedRepetition.js';
import { BUG_STATUSES } from '../data/schema.js';

const CONF = ['Again', 'Hard', 'Good', 'Easy'];
const section = (title, body) => (body ? html`<section class="mem__section"><h2 class="mem__h">${title}</h2>${body}</section>` : '');
const prose = (text) => (text ? html`<div class="prose">${String(text).split(/\n{2,}/).map((p) => html`<p>${p}</p>`)}</div>` : '');

export default function memoryDetail(el, { params }) {
  el.innerHTML = '<div class="page"></div>';
  const page = el.firstElementChild;
  let explanation = null;
  let lastId = null;

  const paint = (d) => {
    if (!d.loaded.memories) { render(page, skeletonList(4)); return; }
    const m = d.memories.find((x) => x.id === params.id);
    if (!m) {
      render(page, emptyState({ iconName: 'search', title: 'This memory doesn’t exist', text: 'It may have been deleted or merged.', action: html`<a class="btn btn--ghost" href="#/memories">Back to memories</a>` }));
      return;
    }
    if (lastId !== m.id) { lastId = m.id; explanation = null; if (m.errorMessage) aiService.explainError(m.errorMessage).then((x) => { if (x) { explanation = x; paint(d); } }); }
    const project = m.projectId ? d.projects.find((p) => p.id === m.projectId) : null;
    const related = memoryService.related(m, 5);
    const cols = collectionService.containing('memory', m.id);
    const due = m.nextReviewAt && m.nextReviewAt <= Date.now();
    render(page, html`
      <nav class="crumbs" aria-label="Breadcrumb"><a href="#/${m.type === 'BUG' ? 'errors' : 'memories'}">${icon('arrowLeft', { size: 14 })}${m.type === 'BUG' ? 'Errors & fixes' : 'Memories'}</a></nav>
      <div class="mem">
        <article class="mem__main">
          <header class="mem__head">
            <div class="mem__badges">${typeBadge(m.type)}${statusBadge(m.status)}${project ? html`<a class="meta-item" href="#/projects/${project.id}">${icon('folder', { size: 12 })}${project.name}</a>` : ''}</div>
            <h1 class="page-title mem__title" tabindex="-1">${m.title}</h1>
            <p class="muted small">Saved ${formatDate(m.createdAt)}${m.updatedAt && m.updatedAt - (m.createdAt || 0) > 60000 ? html`, updated ${relativeTime(m.updatedAt)}` : ''}</p>
            <div class="mem__actions">
              <a class="btn btn--sm btn--ghost" href="#/memories/${m.id}/edit">${icon('edit', { size: 15 })}Edit</a>
              ${favButton(m.isFavorite, html`data-fav`)}
              <button type="button" class="btn btn--sm btn--ghost" data-collect>${icon('layers', { size: 15 })}Add to collection</button>
              ${m.type === 'BUG' ? html`<label class="visually-hidden" for="mstatus">Status</label><select id="mstatus" class="status-select status-select--${m.status}" data-status>${BUG_STATUSES.map((s) => html`<option value="${s}" ${s === m.status ? 'selected' : ''}>${s[0].toUpperCase() + s.slice(1)}</option>`)}</select>` : ''}
              <button type="button" class="icon-btn" data-delete aria-label="Delete memory">${icon('trash', { size: 16 })}</button>
            </div>
          </header>
          ${section('Problem', prose(m.problem))}
          ${m.errorMessage ? section('Error message', codeBlock(m.errorMessage, 'plaintext', { label: false })) : ''}
          ${explanation ? html`<aside class="explain">${icon('spark', { size: 15 })}<div><strong>What this error usually means</strong><p>${explanation}</p></div></aside>` : ''}
          ${m.stackTrace ? html`<details class="mem__section"><summary class="mem__h">Stack trace</summary>${codeBlock(m.stackTrace, m.language === 'python' ? 'python' : 'plaintext', { label: false })}</details>` : ''}
          ${section('Environment', m.environment ? html`<p class="mono small">${m.environment}</p>` : '')}
          ${section('Root cause', prose(m.rootCause))}
          ${section(m.type === 'BUG' ? 'Solution' : 'Key takeaway', prose(m.solution))}
          ${(m.commands || []).length ? section('Commands', html`<div class="cmdlines">${m.commands.map((c) => commandLine(c))}</div>`) : ''}
          ${m.content && m.content.trim() !== (m.problem || '').trim() ? section('Notes', prose(m.content)) : ''}
          ${(m.attachments || []).length ? section('Attachments', html`<ul class="thumbs">${m.attachments.map((a, i) => html`<li><button type="button" class="thumb" data-view-att="${i}" aria-label="View ${a.name}"><img src="${safeUrl(a.url)}" alt="${a.name}" loading="lazy"></button></li>`)}</ul>`) : ''}
          ${m.sourceUrl ? section('Source', html`<a href="${safeUrl(m.sourceUrl)}" target="_blank" rel="noopener noreferrer" class="link-ext">${m.sourceUrl}${icon('external', { size: 13 })}</a>`) : ''}
          ${(m.tags || []).length ? html`<div class="mem__tags">${tagChips(m.tags, { max: 30 })}</div>` : ''}
        </article>

        <aside class="mem__side">
          <section class="panel review-box ${due ? 'is-due' : ''}">
            <h2 class="panel__title">Review</h2>
            <dl class="kv">
              <div><dt>Next review</dt><dd>${m.nextReviewAt ? (due ? 'Due now' : relativeTime(m.nextReviewAt)) : 'Not scheduled'}</dd></div>
              <div><dt>Last reviewed</dt><dd>${m.lastReviewedAt ? relativeTime(m.lastReviewedAt) : 'Never'}</dd></div>
              <div><dt>Reviews</dt><dd>${m.reviewCount || 0}</dd></div>
              <div><dt>Confidence</dt><dd>${m.reviewCount ? CONF[m.confidence || 0] : '—'}</dd></div>
              ${currentIntervalDays(m) ? html`<div><dt>Interval</dt><dd>${describeInterval(currentIntervalDays(m))}</dd></div>` : ''}
            </dl>
            <div class="review-box__actions">
              <a class="btn btn--sm btn--primary" href="#/review?focus=${m.id}">${icon('repeat', { size: 15 })}Review now</a>
              <button type="button" class="btn btn--sm btn--ghost" data-forgot>I forgot this</button>
            </div>
          </section>
          <section class="panel">
            <h2 class="panel__title">You may also want to remember</h2>
            ${related.length ? html`<ul class="related">${related.map(({ memory: r, reasons }) => html`<li><a href="#/memories/${r.id}"><span class="related__t">${r.title}</span><span class="related__why muted small">${reasons.join(', ') || 'related'}</span></a></li>`)}</ul>` : html`<p class="muted small">Nothing related yet. Tags and projects help connect memories.</p>`}
          </section>
          ${cols.length ? html`<section class="panel"><h2 class="panel__title">In collections</h2><ul class="related">${cols.map((c) => html`<li><a href="#/collections/${c.id}">${c.icon} ${c.name}</a></li>`)}</ul></section>` : ''}
        </aside>
      </div>`);
    highlightWithin(page);
  };
  const stop = watch(paint);

  page.addEventListener('click', async (e) => {
    const id = params.id;
    const m = memoryService.get(id);
    if (!m) return;
    if (e.target.closest('[data-fav]')) runAction(() => memoryService.toggleFavorite(id));
    else if (e.target.closest('[data-collect]')) import('../components/editors.js').then((x) => x.openAddToCollection('memory', id));
    else if (e.target.closest('[data-forgot]')) runAction(() => reviewService.forgot(id));
    else if (e.target.closest('[data-delete]')) {
      if (await confirmDialog({ title: 'Delete this memory?', message: `“${m.title}” will be removed. You can undo right after.`, confirmLabel: 'Delete', danger: true })) {
        runAction(async () => {
          memoryService.remove(id);
          location.hash = m.type === 'BUG' ? '#/errors' : '#/memories';
        });
      }
    } else if (e.target.closest('[data-view-att]')) {
      const a = m.attachments[Number(e.target.closest('[data-view-att]').dataset.viewAtt)];
      const modal = openModal({
        title: a.name, size: 'xl',
        body: html`<figure class="lightbox"><img src="${safeUrl(a.url)}" alt="${a.name}"></figure>`,
        footer: html`<a class="btn btn--ghost" href="${safeUrl(a.url)}" target="_blank" rel="noopener noreferrer">${icon('external', { size: 15 })}Open original</a><span class="spacer"></span><button type="button" class="btn btn--danger" data-del-att>${icon('trash', { size: 15 })}Delete image</button>`,
      });
      modal.root.querySelector('[data-del-att]').addEventListener('click', () => runAction(async () => {
        if (!(await confirmDialog({ title: 'Delete this image?', message: 'The file is removed from storage. This can’t be undone.', confirmLabel: 'Delete image', danger: true }))) return;
        await attachmentService.remove(a);
        memoryService.update(id, { attachments: m.attachments.filter((x) => x.path !== a.path) }, { silent: true });
        toast('Image deleted', { type: 'info' });
        modal.close();
      }));
    }
  });
  page.addEventListener('change', (e) => {
    if (e.target.matches('[data-status]')) runAction(() => memoryService.setStatus(params.id, e.target.value));
  });
  return stop;
}
