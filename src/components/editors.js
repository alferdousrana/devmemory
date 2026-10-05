/** Modal editors for snippets, commands, projects, bookmarks and collections. */
import { html } from '../utils/html.js';
import { openModal, confirmDialog } from './modal.js';
import { icon } from './icons.js';
import { mountTagInput, allTags } from './tagInput.js';
import { dataStore } from '../state/dataStore.js';
import { runAction } from '../services/notify.js';
import { snippetService } from '../services/snippetService.js';
import { commandService } from '../services/commandService.js';
import { projectService } from '../services/projectService.js';
import { bookmarkService } from '../services/bookmarkService.js';
import { collectionService } from '../services/collectionService.js';
import { profileService } from '../services/profileService.js';
import { SNIPPET_LANGUAGES, LANGUAGE_LABELS, COMMAND_CATEGORIES, COMMAND_OS, BOOKMARK_CATEGORIES, PROJECT_STATUSES } from '../data/schema.js';
import { formData, splitLines } from '../utils/dom.js';
import { guessCodeLanguage } from '../services/localParser.js';

const projectOptions = (selected = '') => html`<option value="">No project</option>${dataStore.get().projects.map((p) => html`<option value="${p.id}" ${p.id === selected ? 'selected' : ''}>${p.name}</option>`)}`;

function footer(isEdit, label) {
  return html`${isEdit ? html`<button type="button" class="btn btn--ghost btn--danger-text" data-delete>${icon('trash', { size: 15 })}Delete</button>` : ''}
    <span class="spacer"></span><button type="button" class="btn btn--ghost" data-close>Cancel</button>
    <button type="submit" class="btn btn--primary" data-submit>${isEdit ? 'Save changes' : label}</button>`;
}

function wire(m, { onSubmit, onDelete, deleteLabel }) {
  const form = m.root.querySelector('form');
  const submit = (e) => {
    e?.preventDefault();
    runAction(() => { if (onSubmit(formData(form), form) !== false) m.close(true); });
  };
  form.addEventListener('submit', submit);
  m.root.querySelector('[data-submit]').addEventListener('click', submit);
  m.root.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(e); });
  m.root.querySelector('[data-delete]')?.addEventListener('click', async () => {
    if (await confirmDialog({ title: `Delete ${deleteLabel}?`, message: 'You can undo this for a few seconds afterwards.', confirmLabel: 'Delete', danger: true })) {
      runAction(() => { onDelete(); m.close(true); });
    }
  });
  return form;
}

export async function openSnippetEditor(snippet = null, defaults = {}) {
  const s = snippet || { title: '', description: '', code: '', language: 'python', tags: [], projectId: '', ...defaults };
  const isEdit = !!snippet;
  const tabSize = profileService.settings().editorTabSize || 2;
  const m = openModal({
    title: isEdit ? 'Edit snippet' : 'New snippet',
    size: 'xl',
    className: 'editor-modal',
    body: html`<form class="form-grid" novalidate>
      <label class="field field--wide"><span class="field__label">Title</span><input class="input" name="title" value="${s.title}" required autofocus placeholder="Retry decorator with backoff"></label>
      <label class="field"><span class="field__label">Language</span><select class="input" name="language">${SNIPPET_LANGUAGES.map((l) => html`<option value="${l}" ${l === s.language ? 'selected' : ''}>${LANGUAGE_LABELS[l]}</option>`)}</select></label>
      <label class="field"><span class="field__label">Project</span><select class="input" name="projectId">${projectOptions(s.projectId)}</select></label>
      <div class="field field--wide"><span class="field__label" id="code-label">Code</span><div class="editor-slot" data-editor></div><span class="field__hint">Tab indents. Press Esc then Tab to leave the editor.</span></div>
      <label class="field field--wide"><span class="field__label">Description</span><textarea class="input" name="description" rows="2" placeholder="When to use it, gotchas…">${s.description}</textarea></label>
      <div class="field field--wide" data-tags></div>
    </form>`,
    footer: footer(isEdit, 'Save snippet'),
  });
  const { createCodeEditor } = await import('./codeEditor.js');
  const form = m.root.querySelector('form');
  let langTouched = isEdit;
  form.elements.language.addEventListener('change', () => { langTouched = true; editor.setLanguage(form.elements.language.value); });
  const editor = createCodeEditor(m.root.querySelector('[data-editor]'), {
    value: s.code, language: s.language, tabSize, label: 'Code',
    onChange: (v) => {
      if (!langTouched && v.length > 20) {
        const g = guessCodeLanguage(v);
        if (g !== 'plaintext' && g !== form.elements.language.value) { form.elements.language.value = g; editor.setLanguage(g); }
      }
    },
  });
  const tags = mountTagInput(m.root.querySelector('[data-tags]'), { value: s.tags, suggestions: allTags(dataStore.get()) });
  wire(m, {
    deleteLabel: 'snippet',
    onSubmit: (data) => {
      const payload = { ...data, code: editor.getValue(), tags: tags.get() };
      if (isEdit) snippetService.update(snippet.id, payload); else snippetService.create(payload);
    },
    onDelete: () => snippetService.remove(snippet.id),
  });
  return m;
}

export function openCommandEditor(command = null, defaults = {}) {
  const c = command || { command: '', description: '', example: '', category: 'Git', os: 'any', tags: [], projectId: '', ...defaults };
  const isEdit = !!command;
  const m = openModal({
    title: isEdit ? 'Edit command' : 'New command',
    size: 'md',
    body: html`<form class="form-grid" novalidate>
      <label class="field field--wide"><span class="field__label">Command</span><input class="input mono" name="command" value="${c.command}" required autofocus spellcheck="false" autocapitalize="off" placeholder="docker compose logs -f web"></label>
      <label class="field field--wide"><span class="field__label">What it does</span><input class="input" name="description" value="${c.description}" placeholder="Follow logs for the web service"></label>
      <label class="field"><span class="field__label">Category</span><select class="input" name="category">${COMMAND_CATEGORIES.map((x) => html`<option ${x === c.category ? 'selected' : ''}>${x}</option>`)}</select></label>
      <label class="field"><span class="field__label">OS</span><select class="input" name="os">${COMMAND_OS.map((x) => html`<option value="${x}" ${x === c.os ? 'selected' : ''}>${x === 'any' ? 'Any OS' : x}</option>`)}</select></label>
      <label class="field field--wide"><span class="field__label">Example</span><textarea class="input mono" name="example" rows="3" spellcheck="false" placeholder="Optional: example usage or output">${c.example}</textarea></label>
      <label class="field"><span class="field__label">Project</span><select class="input" name="projectId">${projectOptions(c.projectId)}</select></label>
      <div class="field" data-tags></div>
    </form>`,
    footer: footer(isEdit, 'Save command'),
  });
  const tags = mountTagInput(m.root.querySelector('[data-tags]'), { value: c.tags, suggestions: allTags(dataStore.get()) });
  wire(m, {
    deleteLabel: 'command',
    onSubmit: (data) => {
      const payload = { ...data, tags: tags.get() };
      if (isEdit) commandService.update(command.id, payload); else commandService.create(payload);
    },
    onDelete: () => commandService.remove(command.id),
  });
  return m;
}

export function openProjectEditor(project = null) {
  const p = project || { name: '', description: '', repoUrl: '', liveUrl: '', techStack: [], status: 'active', runCommand: '', backendCommand: '', frontendCommand: '', importantCommands: [], environment: '', architecture: '', deployment: '', database: '', knownBugs: '', tags: [] };
  const isEdit = !!project;
  const m = openModal({
    title: isEdit ? `Edit ${p.name}` : 'New project',
    size: 'lg',
    className: 'editor-modal',
    body: html`<form class="form-grid" novalidate>
      <label class="field"><span class="field__label">Name</span><input class="input" name="name" value="${p.name}" required autofocus placeholder="AlgoVision AI"></label>
      <label class="field"><span class="field__label">Status</span><select class="input" name="status">${PROJECT_STATUSES.map((x) => html`<option value="${x}" ${x === p.status ? 'selected' : ''}>${x[0].toUpperCase() + x.slice(1)}</option>`)}</select></label>
      <label class="field field--wide"><span class="field__label">Description</span><textarea class="input" name="description" rows="2">${p.description}</textarea></label>
      <label class="field field--wide"><span class="field__label">Tech stack <span class="muted">(comma separated)</span></span><input class="input" name="techStack" value="${(p.techStack || []).join(', ')}" placeholder="Django, React, PostgreSQL, Docker"></label>
      <label class="field"><span class="field__label">Repository URL</span><input class="input" name="repoUrl" type="url" value="${p.repoUrl}" placeholder="https://github.com/you/project"></label>
      <label class="field"><span class="field__label">Live URL</span><input class="input" name="liveUrl" type="url" value="${p.liveUrl}" placeholder="https://"></label>
      <fieldset class="field field--wide fieldset"><legend class="field__label">Quick start</legend>
        <div class="form-grid form-grid--3">
          <label class="field"><span class="field__hint">Run everything</span><input class="input mono" name="runCommand" value="${p.runCommand}" placeholder="docker compose up" spellcheck="false"></label>
          <label class="field"><span class="field__hint">Backend</span><input class="input mono" name="backendCommand" value="${p.backendCommand}" placeholder="python manage.py runserver" spellcheck="false"></label>
          <label class="field"><span class="field__hint">Frontend</span><input class="input mono" name="frontendCommand" value="${p.frontendCommand}" placeholder="npm run dev" spellcheck="false"></label>
        </div>
      </fieldset>
      <label class="field field--wide"><span class="field__label">Important commands <span class="muted">(one per line)</span></span><textarea class="input mono" name="importantCommands" rows="3" spellcheck="false">${(p.importantCommands || []).join('\n')}</textarea></label>
      <label class="field field--wide"><span class="field__label">Environment notes</span><textarea class="input mono" name="environment" rows="3" spellcheck="false" placeholder="Variable names and where they come from. Don’t paste real secrets.">${p.environment}</textarea></label>
      <label class="field field--wide"><span class="field__label">Architecture</span><textarea class="input" name="architecture" rows="3">${p.architecture}</textarea></label>
      <label class="field field--wide"><span class="field__label">Deployment</span><textarea class="input" name="deployment" rows="3">${p.deployment}</textarea></label>
      <label class="field"><span class="field__label">Database</span><input class="input" name="database" value="${p.database}"></label>
      <div class="field" data-tags></div>
      <label class="field field--wide"><span class="field__label">Known bugs</span><textarea class="input" name="knownBugs" rows="2">${p.knownBugs}</textarea></label>
    </form>`,
    footer: footer(isEdit, 'Create project'),
  });
  const tags = mountTagInput(m.root.querySelector('[data-tags]'), { value: p.tags, suggestions: allTags(dataStore.get()) });
  wire(m, {
    deleteLabel: 'project',
    onSubmit: (data) => {
      const payload = { ...data, importantCommands: splitLines(data.importantCommands), tags: tags.get() };
      if (isEdit) projectService.update(project.id, payload);
      else { const id = projectService.create(payload); setTimeout(() => { location.hash = `#/projects/${id}`; }, 0); }
    },
    onDelete: () => { projectService.remove(project.id); location.hash = '#/projects'; },
  });
  return m;
}

export function openBookmarkEditor(bookmark = null, defaults = {}) {
  const b = bookmark || { title: '', url: '', description: '', category: 'auto', notes: '', tags: [], projectId: '', ...defaults };
  const isEdit = !!bookmark;
  const m = openModal({
    title: isEdit ? 'Edit bookmark' : 'New bookmark',
    size: 'md',
    body: html`<form class="form-grid" novalidate>
      <label class="field field--wide"><span class="field__label">URL</span><input class="input" name="url" type="url" value="${b.url}" required autofocus placeholder="https://docs.djangoproject.com/…"></label>
      <label class="field field--wide"><span class="field__label">Title</span><input class="input" name="title" value="${b.title}" placeholder="Leave empty to use the site name"></label>
      <label class="field"><span class="field__label">Category</span><select class="input" name="category"><option value="auto">Detect from URL</option>${BOOKMARK_CATEGORIES.map((x) => html`<option value="${x}" ${x === b.category ? 'selected' : ''}>${x === 'stackoverflow' ? 'Stack Overflow' : x === 'github' ? 'GitHub' : x === 'youtube' ? 'YouTube' : x[0].toUpperCase() + x.slice(1)}</option>`)}</select></label>
      <label class="field"><span class="field__label">Project</span><select class="input" name="projectId">${projectOptions(b.projectId)}</select></label>
      <label class="field field--wide"><span class="field__label">Description</span><input class="input" name="description" value="${b.description}"></label>
      <label class="field field--wide"><span class="field__label">Notes</span><textarea class="input" name="notes" rows="3" placeholder="What’s useful here?">${b.notes}</textarea></label>
      <div class="field field--wide" data-tags></div>
    </form>`,
    footer: footer(isEdit, 'Save bookmark'),
  });
  const tags = mountTagInput(m.root.querySelector('[data-tags]'), { value: b.tags, suggestions: allTags(dataStore.get()) });
  wire(m, {
    deleteLabel: 'bookmark',
    onSubmit: (data) => {
      const payload = { ...data, tags: tags.get() };
      if (isEdit) bookmarkService.update(bookmark.id, payload); else bookmarkService.create(payload);
    },
    onDelete: () => bookmarkService.remove(bookmark.id),
  });
  return m;
}

export function openCollectionEditor(collection = null) {
  const c = collection || { name: '', description: '', icon: '📁' };
  const isEdit = !!collection;
  const ICONS = ['📁', '🎯', '🐳', '🐍', '⚛️', '🧱', '☁️', '🎓', '💼', '🔐', '🧪', '📚'];
  const m = openModal({
    title: isEdit ? 'Edit collection' : 'New collection',
    size: 'sm',
    body: html`<form class="form-grid" novalidate>
      <label class="field field--wide"><span class="field__label">Name</span><input class="input" name="name" value="${c.name}" required autofocus placeholder="Interview preparation"></label>
      <fieldset class="field field--wide fieldset"><legend class="field__label">Icon</legend><div class="emoji-pick">${ICONS.map((e) => html`<label><input type="radio" name="icon" value="${e}" ${e === c.icon ? 'checked' : ''}><span>${e}</span></label>`)}</div></fieldset>
      <label class="field field--wide"><span class="field__label">Description</span><textarea class="input" name="description" rows="2">${c.description}</textarea></label>
    </form>`,
    footer: footer(isEdit, 'Create collection'),
  });
  wire(m, {
    deleteLabel: 'collection',
    onSubmit: (data) => { if (isEdit) collectionService.update(collection.id, data); else collectionService.create(data); },
    onDelete: () => { collectionService.remove(collection.id); location.hash = '#/collections'; },
  });
  return m;
}

/** Pick a collection to add an item to (or create one). */
export function openAddToCollection(kind, id) {
  const cols = collectionService.list();
  const m = openModal({
    title: 'Add to collection',
    size: 'sm',
    body: cols.length
      ? html`<ul class="pick-list">${cols.map((c) => {
        const inIt = (c.items || []).some((i) => i.kind === kind && i.id === id);
        return html`<li><button type="button" class="pick" data-col="${c.id}" ${inIt ? 'disabled' : ''}><span>${c.icon}</span><span>${c.name}</span><span class="muted small">${inIt ? 'Added' : `${(c.items || []).length} items`}</span></button></li>`;
      })}</ul>`
      : html`<p class="muted">No collections yet.</p>`,
    footer: html`<button type="button" class="btn btn--ghost" data-new>${icon('plus', { size: 15 })}New collection</button>`,
  });
  m.root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-col]');
    if (b) runAction(() => { collectionService.addItem(b.dataset.col, kind, id); m.close(); });
    if (e.target.closest('[data-new]')) { m.close(); openCollectionEditor(); }
  });
}
