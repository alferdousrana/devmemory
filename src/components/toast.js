/** Toast notifications — never alert(). Accessible via aria-live regions. */
import { html, render } from '../utils/html.js';
import { icon } from './icons.js';

let container = null;
const ICONS = { success: 'check', error: 'alert', info: 'spark', offline: 'cloudOff' };

function ensureContainer() {
  if (container && document.body.contains(container)) return container;
  container = document.createElement('div');
  container.className = 'toasts';
  container.innerHTML = '<div class="toasts__polite" role="status" aria-live="polite"></div><div class="toasts__assertive" role="alert" aria-live="assertive"></div>';
  document.body.appendChild(container);
  return container;
}

/**
 * @param {string} message
 * @param {{type?: 'success'|'error'|'info'|'offline', duration?: number, action?: {label: string, onClick: Function}}} opts
 */
export function toast(message, { type = 'info', duration = 3600, action = null } = {}) {
  const root = ensureContainer();
  const region = root.querySelector(type === 'error' ? '.toasts__assertive' : '.toasts__polite');
  const el = document.createElement('div');
  el.className = `toast toast--${type}`;
  render(el, html`
    <span class="toast__icon">${icon(ICONS[type] || 'spark', { size: 16 })}</span>
    <span class="toast__msg">${message}</span>
    ${action ? html`<button type="button" class="toast__action">${action.label}</button>` : ''}
    <button type="button" class="toast__close" aria-label="Dismiss notification">${icon('x', { size: 14 })}</button>`);
  const remove = () => {
    el.classList.add('toast--leaving');
    setTimeout(() => el.remove(), 180);
  };
  el.querySelector('.toast__close').addEventListener('click', remove);
  if (action) el.querySelector('.toast__action').addEventListener('click', () => { action.onClick(); remove(); });
  region.appendChild(el);
  const all = root.querySelectorAll('.toast');
  if (all.length > 4) all[0].remove();
  let timer = setTimeout(remove, duration + (action ? 2000 : 0));
  el.addEventListener('mouseenter', () => clearTimeout(timer));
  el.addEventListener('mouseleave', () => { timer = setTimeout(remove, 1800); });
  el.addEventListener('focusin', () => clearTimeout(timer));
  return remove;
}
