/**
 * Lightweight code editor: a <textarea> layered over a highlighted <pre>.
 * Native undo, selection, IME and screen reader support come from the textarea.
 * Tab inserts spaces (Esc then Tab moves focus, per WCAG keyboard-trap guidance).
 */
import { highlightCode } from './codeHighlight.js';
import { escapeHtml } from '../utils/html.js';

export function createCodeEditor(container, { value = '', language = 'plaintext', tabSize = 2, label = 'Code', onChange = () => {} } = {}) {
  container.classList.add('code-editor');
  container.innerHTML = `<pre class="code-editor__hl" aria-hidden="true"><code></code></pre>
    <textarea class="code-editor__input" spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off" aria-label="${escapeHtml(label)}"></textarea>`;
  const ta = container.querySelector('textarea');
  const code = container.querySelector('code');
  const pre = container.querySelector('pre');
  let lang = language;
  let escPressed = false;
  let seq = 0;
  ta.value = value;

  const paint = async () => {
    const mine = ++seq;
    const text = ta.value.endsWith('\n') ? `${ta.value} ` : ta.value; // keep last line height
    code.innerHTML = escapeHtml(text);
    const out = await highlightCode(text, lang);
    if (mine === seq) code.innerHTML = out;
  };
  const sync = () => { pre.scrollTop = ta.scrollTop; pre.scrollLeft = ta.scrollLeft; };

  ta.addEventListener('input', () => { paint(); onChange(ta.value); });
  ta.addEventListener('scroll', sync);
  ta.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { escPressed = true; return; }
    if (e.key === 'Tab' && !escPressed && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      const { selectionStart: s, selectionEnd: end, value: v } = ta;
      const pad = ' '.repeat(tabSize);
      if (e.shiftKey) {
        const lineStart = v.lastIndexOf('\n', s - 1) + 1;
        if (v.slice(lineStart, lineStart + tabSize) === pad) {
          ta.setRangeText('', lineStart, lineStart + tabSize, 'preserve');
        }
      } else {
        ta.setRangeText(pad, s, end, 'end');
      }
      ta.dispatchEvent(new Event('input'));
      return;
    }
    escPressed = false;
    if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) {
      // keep indentation of the current line
      const { selectionStart: s, value: v } = ta;
      const lineStart = v.lastIndexOf('\n', s - 1) + 1;
      const indent = v.slice(lineStart).match(/^[ \t]*/)[0];
      if (indent) { e.preventDefault(); ta.setRangeText(`\n${indent}`, s, ta.selectionEnd, 'end'); ta.dispatchEvent(new Event('input')); }
    }
  });
  paint();

  return {
    textarea: ta,
    getValue: () => ta.value,
    setValue: (v) => { ta.value = v; paint(); },
    setLanguage: (l) => { lang = l; paint(); },
    focus: () => ta.focus(),
  };
}
