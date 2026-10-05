/**
 * Syntax highlighting — highlight.js core + only the languages DevMemory
 * supports, loaded lazily on first use (keeps the initial bundle small).
 * hljs escapes its input, so its output is safe to insert.
 */
import { escapeHtml } from '../utils/html.js';

let loading = null;
const ALIASES = { html: 'xml', shell: 'bash', sh: 'bash', zsh: 'bash', js: 'javascript', ts: 'typescript', py: 'python', yml: 'yaml', md: 'markdown', docker: 'dockerfile', postgresql: 'sql', plaintext: null };

export function loadHighlighter() {
  if (!loading) {
    loading = (async () => {
      const [core, python, javascript, typescript, xml, css, sql, bash, json, django, dockerfile, yaml, markdown] = await Promise.all([
        import('highlight.js/lib/core'),
        import('highlight.js/lib/languages/python'),
        import('highlight.js/lib/languages/javascript'),
        import('highlight.js/lib/languages/typescript'),
        import('highlight.js/lib/languages/xml'),
        import('highlight.js/lib/languages/css'),
        import('highlight.js/lib/languages/sql'),
        import('highlight.js/lib/languages/bash'),
        import('highlight.js/lib/languages/json'),
        import('highlight.js/lib/languages/django'),
        import('highlight.js/lib/languages/dockerfile'),
        import('highlight.js/lib/languages/yaml'),
        import('highlight.js/lib/languages/markdown'),
      ]);
      const hljs = core.default;
      const reg = { python, javascript, typescript, xml, css, sql, bash, json, django, dockerfile, yaml, markdown };
      for (const [name, mod] of Object.entries(reg)) hljs.registerLanguage(name, mod.default);
      return hljs;
    })();
  }
  return loading;
}

export function resolveLang(lang) {
  const l = String(lang || '').toLowerCase();
  return l in ALIASES ? ALIASES[l] : l;
}

export async function highlightCode(code, lang) {
  const language = resolveLang(lang);
  if (!language) return escapeHtml(code);
  try {
    const hljs = await loadHighlighter();
    if (!hljs.getLanguage(language)) return escapeHtml(code);
    return hljs.highlight(String(code), { language, ignoreIllegals: true }).value;
  } catch { return escapeHtml(code); }
}

/** Highlight every <code data-lang> inside root that hasn't been highlighted yet. */
export async function highlightWithin(root) {
  const blocks = [...root.querySelectorAll('code[data-lang]:not([data-hl])')];
  if (!blocks.length) return;
  await Promise.all(blocks.map(async (el) => {
    el.dataset.hl = '1';
    const out = await highlightCode(el.textContent, el.dataset.lang);
    if (document.contains(el)) el.innerHTML = out;
  }));
}
