import { html } from '../utils/html.js';
import { icon } from './icons.js';
import { langLabel } from './ui.js';

/** Read-only code block with language label and copy button. Call highlightWithin() after render. */
export function codeBlock(code, lang = 'plaintext', { copyAttr = 'data-copy-code', label = true, maxLines = 0 } = {}) {
  const text = String(code || '');
  const clipped = maxLines ? text.split('\n').slice(0, maxLines).join('\n') : text;
  return html`<div class="codeblock">
    <div class="codeblock__bar">
      ${label ? html`<span class="codeblock__lang">${langLabel(lang)}</span>` : html`<span></span>`}
      <button type="button" class="btn btn--tiny btn--ghost" ${copyAttr === 'data-copy-code' ? html`data-copy-code` : html`data-copy`} data-text="${text}" aria-label="Copy code">${icon('copy', { size: 14 })}<span>Copy</span></button>
    </div>
    <pre class="codeblock__pre"><code data-lang="${lang}">${clipped}</code></pre>
  </div>`;
}

/** One-line command with copy button. */
export function commandLine(cmd, { attrs = '' } = {}) {
  return html`<div class="cmdline"><span class="cmdline__prompt" aria-hidden="true">$</span><code class="cmdline__text">${cmd}</code>
    <button type="button" class="icon-btn icon-btn--sm" data-copy data-text="${cmd}" ${attrs} aria-label="Copy command">${icon('copy', { size: 14 })}</button></div>`;
}
