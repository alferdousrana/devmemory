/** "⚠️ You may have solved this before." */
import { html } from '../utils/html.js';
import { icon } from './icons.js';
import { typeBadge, timeAgo } from './ui.js';

export function duplicatePanel(matches) {
  if (!matches?.length) return html``;
  return html`<section class="dupe" role="status" aria-live="polite">
    <p class="dupe__title">${icon('alert', { size: 16 })}<span>You may have solved this before.</span></p>
    <ul class="dupe__list">${matches.map(({ memory, similarity }) => html`
      <li class="dupe__item">
        <div class="dupe__info">
          <span class="dupe__name">${memory.title}</span>
          <span class="dupe__meta">${typeBadge(memory.type)}<span>${similarity}% similar</span>${timeAgo(memory.updatedAt || memory.createdAt)}</span>
        </div>
        <div class="dupe__actions">
          <button type="button" class="btn btn--tiny btn--ghost" data-dupe-open="${memory.id}">Open</button>
          <button type="button" class="btn btn--tiny btn--ghost" data-dupe-merge="${memory.id}">${icon('merge', { size: 13 })}Merge</button>
        </div>
      </li>`)}</ul>
    <button type="button" class="btn btn--tiny btn--link" data-dupe-dismiss>Save anyway</button>
  </section>`;
}
