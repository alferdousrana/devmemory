/** Tag chips input: Enter, comma or space adds; Backspace on empty removes the last tag. */
import { normalizeTag } from '../utils/keywords.js';
import { escapeHtml } from '../utils/html.js';

let seq = 0;

export function mountTagInput(container, { value = [], suggestions = [], label = 'Tags', onChange = () => {} } = {}) {
  const id = `tags-${++seq}`;
  let tags = [...new Set((value || []).map(normalizeTag).filter(Boolean))];
  container.classList.add('tag-input');
  container.innerHTML = `<label class="field__label" for="${id}">${escapeHtml(label)}</label>
    <div class="tag-input__box"><span class="tag-input__chips"></span>
    <input id="${id}" class="tag-input__field" list="${id}-list" placeholder="Add tag…" autocomplete="off" autocapitalize="off" spellcheck="false"></div>
    <datalist id="${id}-list">${[...new Set(suggestions)].slice(0, 200).map((s) => `<option value="${escapeHtml(s)}">`).join('')}</datalist>`;
  const chips = container.querySelector('.tag-input__chips');
  const input = container.querySelector('input');

  const paint = () => {
    chips.innerHTML = tags.map((t, i) => `<span class="chip">#${escapeHtml(t)}<button type="button" data-i="${i}" aria-label="Remove tag ${escapeHtml(t)}">×</button></span>`).join('');
  };
  const add = (raw) => {
    const t = normalizeTag(raw);
    if (t && !tags.includes(t) && tags.length < 30) { tags.push(t); paint(); onChange(tags); }
  };
  input.addEventListener('keydown', (e) => {
    if (['Enter', ',', ' '].includes(e.key)) {
      if (input.value.trim()) { e.preventDefault(); add(input.value); input.value = ''; }
      else if (e.key !== 'Enter') e.preventDefault();
    } else if (e.key === 'Backspace' && !input.value && tags.length) {
      tags.pop(); paint(); onChange(tags);
    }
  });
  input.addEventListener('change', () => { if (input.value.trim()) { add(input.value); input.value = ''; } });
  input.addEventListener('blur', () => { if (input.value.trim()) { add(input.value); input.value = ''; } });
  chips.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-i]');
    if (!btn) return;
    tags.splice(Number(btn.dataset.i), 1); paint(); onChange(tags); input.focus();
  });
  paint();
  return {
    get: () => { if (input.value.trim()) { add(input.value); input.value = ''; } return [...tags]; },
    set: (next) => { tags = [...new Set((next || []).map(normalizeTag).filter(Boolean))]; paint(); },
  };
}

export function allTags(data) {
  const set = new Set();
  for (const k of ['memories', 'snippets', 'commands', 'bookmarks', 'projects']) for (const r of data[k] || []) for (const t of r.tags || []) set.add(t);
  return [...set].sort();
}
