/** Accessible modal dialogs: focus trap, Esc to close, focus restore, background inert. */
import { html, render } from '../utils/html.js';
import { icon } from './icons.js';

let openCount = 0;
let seq = 0;
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function setBackgroundInert(on) {
  for (const id of ['app']) {
    const el = document.getElementById(id);
    if (!el) continue;
    if (on) el.setAttribute('inert', ''); else el.removeAttribute('inert');
  }
}

/**
 * @returns {{root: HTMLElement, body: HTMLElement, close: Function}}
 */
export function openModal({ title, body, footer = null, size = 'md', onClose = null, dismissible = true, className = '' }) {
  const id = `modal-${++seq}`;
  const previous = document.activeElement;
  const root = document.createElement('div');
  root.className = `modal-root ${className}`;
  render(root, html`
    <div class="modal-backdrop" ${dismissible ? html`data-close` : ''}></div>
    <div class="modal modal--${size}" role="dialog" aria-modal="true" aria-labelledby="${id}-title">
      <header class="modal__head">
        <h2 class="modal__title" id="${id}-title">${title}</h2>
        ${dismissible ? html`<button type="button" class="icon-btn" data-close aria-label="Close dialog">${icon('x')}</button>` : ''}
      </header>
      <div class="modal__body">${body}</div>
      ${footer ? html`<footer class="modal__foot">${footer}</footer>` : ''}
    </div>`);
  document.body.appendChild(root);
  openCount++;
  setBackgroundInert(true);
  document.body.classList.add('has-modal');

  let closed = false;
  const close = (result) => {
    if (closed) return;
    closed = true;
    root.removeEventListener('keydown', onKey);
    window.removeEventListener('hashchange', onNav);
    root.classList.add('modal-root--leaving');
    setTimeout(() => root.remove(), 140);
    openCount--;
    if (!openCount) { setBackgroundInert(false); document.body.classList.remove('has-modal'); }
    if (previous && document.contains(previous)) previous.focus?.();
    onClose?.(result);
  };

  const onKey = (e) => {
    if (e.key === 'Escape' && dismissible) { e.preventDefault(); e.stopPropagation(); close(); return; }
    if (e.key !== 'Tab') return;
    const items = [...root.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null || el === document.activeElement);
    if (!items.length) return;
    const first = items[0]; const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };
  root.addEventListener('keydown', onKey);
  // Navigating away (links inside a dialog, back button) closes it.
  const onNav = () => { window.removeEventListener('hashchange', onNav); close(); };
  window.addEventListener('hashchange', onNav);
  root.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) close(); });

  requestAnimationFrame(() => {
    const target = root.querySelector('[autofocus]') || root.querySelector('.modal__body ' + FOCUSABLE) || root.querySelector(FOCUSABLE);
    target?.focus();
  });

  return { root, body: root.querySelector('.modal__body'), close };
}

/** Confirmation dialog. With requireText, the user must type that text to confirm. */
export function confirmDialog({ title, message, details = null, confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = false, requireText = null }) {
  return new Promise((resolve) => {
    const m = openModal({
      title,
      size: 'sm',
      body: html`
        <p class="dialog-message">${message}</p>
        ${details || ''}
        ${requireText ? html`<label class="field"><span class="field__label">Type <code>${requireText}</code> to confirm</span>
          <input class="input" name="confirmText" autocomplete="off" autocapitalize="off" spellcheck="false" autofocus></label>` : ''}`,
      footer: html`
        <button type="button" class="btn btn--ghost" data-cancel>${cancelLabel}</button>
        <button type="button" class="btn ${danger ? 'btn--danger' : 'btn--primary'}" data-confirm ${requireText ? 'disabled' : ''} ${requireText ? '' : 'autofocus'}>${confirmLabel}</button>`,
      onClose: (r) => resolve(r === true),
    });
    const confirmBtn = m.root.querySelector('[data-confirm]');
    if (requireText) {
      m.root.querySelector('[name="confirmText"]').addEventListener('input', (e) => {
        confirmBtn.disabled = e.target.value.trim() !== requireText;
      });
    }
    confirmBtn.addEventListener('click', () => m.close(true));
    m.root.querySelector('[data-cancel]').addEventListener('click', () => m.close(false));
  });
}

export function promptDialog({ title, label, type = 'text', placeholder = '', confirmLabel = 'Continue', value = '' }) {
  return new Promise((resolve) => {
    const m = openModal({
      title, size: 'sm',
      body: html`<form data-prompt><label class="field"><span class="field__label">${label}</span>
        <input class="input" name="value" type="${type}" placeholder="${placeholder}" value="${value}" autofocus required></label></form>`,
      footer: html`<button type="button" class="btn btn--ghost" data-close>Cancel</button><button type="submit" form="" class="btn btn--primary" data-ok>${confirmLabel}</button>`,
      onClose: (r) => resolve(typeof r === 'string' ? r : null),
    });
    const input = m.root.querySelector('input');
    const submit = (e) => { e?.preventDefault(); if (input.value) m.close(input.value); };
    m.root.querySelector('[data-prompt]').addEventListener('submit', submit);
    m.root.querySelector('[data-ok]').addEventListener('click', submit);
  });
}
