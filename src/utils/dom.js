export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/** Delegated event listener. Returns an unsubscribe function. */
export function on(root, type, selector, handler, options) {
  const listener = (e) => {
    const target = e.target.closest?.(selector);
    if (target && root.contains(target)) handler(e, target);
  };
  root.addEventListener(type, listener, options);
  return () => root.removeEventListener(type, listener, options);
}

export function debounce(fn, ms = 200) {
  let t;
  const wrapped = (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  wrapped.cancel = () => clearTimeout(t);
  return wrapped;
}

export function formData(form) {
  const data = {};
  for (const el of form.elements) {
    if (!el.name || el.disabled) continue;
    if (el.type === 'checkbox') data[el.name] = el.checked;
    else if (el.type === 'radio') { if (el.checked) data[el.name] = el.value; }
    else data[el.name] = el.value;
  }
  return data;
}

export const isTypingTarget = (el) =>
  !!el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName));

export const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export const isMac = () => /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
export const modKey = () => (isMac() ? '⌘' : 'Ctrl');

export function splitLines(text) {
  return String(text || '').split('\n').map((s) => s.trim()).filter(Boolean);
}
