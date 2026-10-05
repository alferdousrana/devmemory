/**
 * Quick Capture (Ctrl/Cmd + Shift + M from anywhere).
 * Type one messy sentence → DevMemory structures it locally (title, type,
 * problem, solution, tags, commands) and warns if you've solved it before.
 */
import { html, render } from '../utils/html.js';
import { openModal } from './modal.js';
import { icon } from './icons.js';
import { mountTagInput, allTags } from './tagInput.js';
import { duplicatePanel } from './duplicatePanel.js';
import { parseCapture } from '../services/localParser.js';
import { memoryService } from '../services/memoryService.js';
import { runAction, toast } from '../services/notify.js';
import { dataStore } from '../state/dataStore.js';
import { setPendingDraft } from '../state/draft.js';
import { MEMORY_TYPES, TYPE_META } from '../data/schema.js';
import { debounce, modKey, splitLines } from '../utils/dom.js';
import { track } from '../firebase/analytics.js';

let current = null;

export function openQuickCapture({ initialText = '' } = {}) {
  if (current) { current.root.querySelector('textarea[name="raw"]')?.focus(); return; }
  const d = dataStore.get();
  const projects = d.projects.filter((p) => p.status !== 'archived');
  const m = openModal({
    title: 'Quick capture',
    size: 'lg',
    className: 'capture-modal',
    body: html`
      <form class="capture" novalidate>
        <label class="capture__raw">
          <span class="visually-hidden">What did you just figure out?</span>
          <textarea name="raw" rows="4" autofocus placeholder="Django CORS error because frontend origin wasn’t allowed. Installed django-cors-headers and added CORS_ALLOWED_ORIGINS.">${initialText}</textarea>
        </label>
        <p class="capture__hint">Write it the way you’d tell a teammate. DevMemory structures it below — edit anything before saving.</p>
        <div class="capture__dupes" data-dupes></div>
        <div class="capture__parsed" data-parsed hidden>
          <div class="pfield pfield--title">
            <label for="qc-title">Title</label>
            <input id="qc-title" class="input" name="title" autocomplete="off">
          </div>
          <div class="pfield">
            <label for="qc-type">Type</label>
            <select id="qc-type" class="input" name="type">${MEMORY_TYPES.map((t) => html`<option value="${t}">${TYPE_META[t].label}</option>`)}</select>
          </div>
          <div class="pfield">
            <label for="qc-project">Project</label>
            <select id="qc-project" class="input" name="projectId"><option value="">No project</option>${projects.map((p) => html`<option value="${p.id}">${p.name}</option>`)}</select>
          </div>
          <div class="pfield pfield--wide">
            <label for="qc-problem">Problem</label>
            <textarea id="qc-problem" class="input" name="problem" rows="2"></textarea>
          </div>
          <div class="pfield pfield--wide">
            <label for="qc-solution">Solution</label>
            <textarea id="qc-solution" class="input" name="solution" rows="2"></textarea>
          </div>
          <div class="pfield pfield--wide" data-tags></div>
          <div class="pfield pfield--wide">
            <label for="qc-commands">Commands <span class="muted">(one per line)</span></label>
            <textarea id="qc-commands" class="input mono" name="commands" rows="2" spellcheck="false"></textarea>
          </div>
        </div>
      </form>`,
    footer: html`
      <span class="capture__shortcut muted"><kbd>${modKey()}</kbd> <kbd>Enter</kbd> to save</span>
      <button type="button" class="btn btn--ghost" data-full>${icon('edit', { size: 15 })}Full editor</button>
      <button type="button" class="btn btn--primary" data-save>Save memory</button>`,
    onClose: () => { current = null; },
  });
  current = m;
  track('quick_capture_used');

  const form = m.root.querySelector('form');
  const raw = form.elements.raw;
  const parsedBox = m.root.querySelector('[data-parsed]');
  const dupesBox = m.root.querySelector('[data-dupes]');
  const dirty = new Set();
  let parsed = null;
  let dismissedDupes = false;
  const tagCtl = mountTagInput(m.root.querySelector('[data-tags]'), {
    suggestions: allTags(d), onChange: () => dirty.add('tags'),
  });

  for (const name of ['title', 'type', 'projectId', 'problem', 'solution', 'commands']) {
    form.elements[name].addEventListener('input', () => { dirty.add(name); if (name === 'title') checkDupes(); });
  }

  const draft = () => ({
    ...(parsed || {}),
    title: form.elements.title.value.trim(),
    type: form.elements.type.value,
    projectId: form.elements.projectId.value,
    problem: form.elements.problem.value.trim(),
    solution: form.elements.solution.value.trim(),
    commands: splitLines(form.elements.commands.value),
    tags: tagCtl.get(),
    content: raw.value.trim(),
  });

  function checkDupes() {
    if (dismissedDupes) { render(dupesBox, html``); return; }
    const matches = memoryService.findDuplicates(draft());
    render(dupesBox, duplicatePanel(matches));
  }

  const reparse = debounce(() => {
    const text = raw.value.trim();
    parsedBox.hidden = !text;
    if (!text) { render(dupesBox, html``); return; }
    parsed = parseCapture(text);
    const set = (name, value) => { if (!dirty.has(name)) form.elements[name].value = value; };
    set('title', parsed.title);
    set('type', parsed.type);
    set('problem', parsed.problem);
    set('solution', parsed.solution);
    set('commands', parsed.commands.join('\n'));
    if (!dirty.has('tags')) tagCtl.set(parsed.tags);
    if (!dirty.has('projectId') && !form.elements.projectId.value) {
      const match = projects.find((p) => text.toLowerCase().includes(p.name.toLowerCase()));
      if (match) form.elements.projectId.value = match.id;
    }
    parsedBox.classList.add('is-live');
    checkDupes();
  }, 220);
  raw.addEventListener('input', reparse);
  if (initialText) reparse();

  const save = () => runAction(() => {
    if (!raw.value.trim()) { toast('Write something first', { type: 'info' }); raw.focus(); return; }
    reparse.cancel();
    if (!parsed) parsed = parseCapture(raw.value);
    const data = draft();
    if (!data.title) data.title = parsed.title || raw.value.trim().slice(0, 80);
    memoryService.create(data);
    m.close();
  }, 'quick capture');

  m.root.querySelector('[data-save]').addEventListener('click', save);
  form.addEventListener('submit', (e) => { e.preventDefault(); save(); });
  m.root.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); save(); }
  });
  m.root.querySelector('[data-full]').addEventListener('click', () => {
    if (raw.value.trim() && !parsed) parsed = parseCapture(raw.value);
    setPendingDraft(raw.value.trim() ? draft() : null);
    m.close();
    location.hash = '#/memories/new';
  });
  dupesBox.addEventListener('click', (e) => {
    const open = e.target.closest('[data-dupe-open]');
    const merge = e.target.closest('[data-dupe-merge]');
    if (open) { m.close(); location.hash = `#/memories/${open.dataset.dupeOpen}`; }
    else if (merge) {
      runAction(() => {
        memoryService.merge(merge.dataset.dupeMerge, draft());
        toast('Merged into the existing memory ✓', { type: 'success' });
        m.close();
        location.hash = `#/memories/${merge.dataset.dupeMerge}`;
      });
    } else if (e.target.closest('[data-dupe-dismiss]')) { dismissedDupes = true; render(dupesBox, html``); form.elements.title.focus(); }
  });
}
