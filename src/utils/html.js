/**
 * Auto-escaping HTML templates.
 *
 *   html`<h2>${title}</h2>`  → every interpolation is escaped unless it is
 *   itself a SafeHTML value (nested html`` or raw()).
 *
 * This is the only way UI code builds markup, so user content can never be
 * injected as HTML. `raw()` is reserved for trusted markup (our own SVG icons
 * and highlight.js output, which escapes its input).
 */
export class SafeHTML {
  constructor(value) { this.value = value; }
  toString() { return this.value; }
}

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;' };
export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"'`]/g, (c) => ESC[c]);
}

function serialize(v) {
  if (v == null || v === false) return '';
  if (v instanceof SafeHTML) return v.value;
  if (Array.isArray(v)) return v.map(serialize).join('');
  return escapeHtml(v);
}

export function html(strings, ...values) {
  let out = strings[0];
  for (let i = 0; i < values.length; i++) out += serialize(values[i]) + strings[i + 1];
  return new SafeHTML(out);
}

export function raw(markup) { return new SafeHTML(String(markup ?? '')); }

/** Replace an element's children with a SafeHTML template. */
export function render(el, template) {
  if (!(template instanceof SafeHTML)) throw new TypeError('render() expects html`` output');
  el.innerHTML = template.value;
  return el;
}

/** Only allow http(s) / mailto links. Returns '#' for anything else (e.g. javascript:). */
export function safeUrl(url) {
  if (!url) return '#';
  try {
    const u = new URL(String(url), window.location.href);
    return ['http:', 'https:', 'mailto:'].includes(u.protocol) ? u.href : '#';
  } catch { return '#'; }
}

/** Highlight occurrences of `query` terms inside text (escaped). */
export function highlightText(text, query) {
  const t = String(text ?? '');
  const terms = String(query ?? '').toLowerCase().split(/\s+/).filter((x) => x.length > 1 && !x.startsWith('#'));
  if (!terms.length) return escapeHtml(t);
  const re = new RegExp(`(${terms.map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
  return t.split(re).map((part, i) => (i % 2 ? `<mark>${escapeHtml(part)}</mark>` : escapeHtml(part))).join('');
}
