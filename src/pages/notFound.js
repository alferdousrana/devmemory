import { html, render } from '../utils/html.js';
import { emptyState } from '../components/ui.js';
import { isAppMode } from '../state/authState.js';

export default function notFound(el) {
  render(el, html`<div class="page">${emptyState({ iconName: 'search', title: 'This page doesn’t exist', text: 'The link may be old, or the item was deleted.', action: html`<a class="btn btn--primary" href="${isAppMode() ? '#/dashboard' : '#/'}">Go home</a>` })}</div>`);
}
