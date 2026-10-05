/** Full memory editor (new + edit). Full-screen on mobile. */
import { html, render, safeUrl } from '../utils/html.js';
import { icon } from '../components/icons.js';
import { pageHeader, emptyState } from '../components/ui.js';
import { mountTagInput, allTags } from '../components/tagInput.js';
import { duplicatePanel } from '../components/duplicatePanel.js';
import { confirmDialog } from '../components/modal.js';
import { memoryService } from '../services/memoryService.js';
import { attachmentService } from '../services/attachmentService.js';
import { profileService } from '../services/profileService.js';
import { runAction, reportError, toast } from '../services/notify.js';
import { getContext } from '../services/context.js';
import { dataStore } from '../state/dataStore.js';
import { takePendingDraft } from '../state/draft.js';
import { MEMORY_TYPES, TYPE_META, BUG_STATUSES, SNIPPET_LANGUAGES, LANGUAGE_LABELS } from '../data/schema.js';
import { debounce, splitLines, formData } from '../utils/dom.js';
import { isStorageConfigured } from '../config/firebase.js';

export default function memoryEdit(el, { params, query }) {
  const isEdit = !!params.id;
  const d = dataStore.get();
  const existing = isEdit ? d.memories.find((m) => m.id === params.id) : null;
  if (isEdit && !existing) {
    render(el, html`<div class="page">${d.loaded.memories ? emptyState({ iconName: 'search', title: 'This memory doesn’t exist', action: html`<a class="btn btn--ghost" href="#/memories">Back</a>` }) : html`<p class="muted">Loading…</p>`}</div>`);
    if (!d.loaded.memories) {
      const unsub = dataStore.subscribe((s) => { if (s.loaded.memories) { unsub(); memoryEdit(el, { params, query }); } });
      return unsub;
    }
    return undefined;
  }
  const draft = !isEdit ? takePendingDraft() : null;
  const m = existing || {
    type: query.type && MEMORY_TYPES.includes(query.type) ? query.type : (profileService.settings().defaultMemoryType || 'BUG'),
    title: '', problem: '', errorMessage: '', stackTrace: '', environment: '', rootCause: '', solution: '', commands: [],
    content: '', language: '', framework: '', projectId: query.project || '', tags: [], sourceUrl: '', status: 'unresolved', attachments: [],
    ...(draft || {}),
  };
  const ctx = getContext();
  let memoryId = existing?.id || null;
  try { memoryId = memoryId || ctx.repos?.memories.newId(ctx.uid); } catch { memoryId = null; }
  let attachments = [...(m.attachments || [])];
  const uploadedThisSession = [];
  let dirty = !!draft;
  let saved = false;

  render(el, html`<div class="page page--editor">
    ${pageHeader({ title: isEdit ? 'Edit memory' : 'New memory', subtitle: isEdit ? '' : 'Tip: Quick capture fills most of this from one sentence.' })}
    <div data-dupes></div>
    <form class="form-grid memform" novalidate data-type="${m.type}">
      <label class="field field--wide"><span class="field__label">Title</span><input class="input input--lg" name="title" value="${m.title}" required autofocus placeholder="Docker PostgreSQL connection refused"></label>
      <label class="field"><span class="field__label">Type</span><select class="input" name="type">${MEMORY_TYPES.map((t) => html`<option value="${t}" ${t === m.type ? 'selected' : ''}>${TYPE_META[t].label}</option>`)}</select></label>
      <label class="field"><span class="field__label">Project</span><select class="input" name="projectId"><option value="">No project</option>${d.projects.map((p) => html`<option value="${p.id}" ${p.id === m.projectId ? 'selected' : ''}>${p.name}</option>`)}</select></label>
      <label class="field bug-only"><span class="field__label">Status</span><select class="input" name="status">${BUG_STATUSES.map((s) => html`<option value="${s}" ${s === m.status ? 'selected' : ''}>${s[0].toUpperCase() + s.slice(1)}</option>`)}</select></label>
      <label class="field bug-only"><span class="field__label">Environment</span><input class="input" name="environment" value="${m.environment}" placeholder="macOS 15, Python 3.12, Docker 27"></label>
      <label class="field field--wide"><span class="field__label">Problem</span><textarea class="input" name="problem" rows="3" placeholder="What were you trying to do, and what went wrong?">${m.problem}</textarea></label>
      <label class="field field--wide bug-only"><span class="field__label">Error message</span><textarea class="input mono" name="errorMessage" rows="2" spellcheck="false" placeholder="Paste the exact error">${m.errorMessage}</textarea></label>
      <label class="field field--wide bug-only"><span class="field__label">Stack trace <span class="muted">(optional)</span></span><textarea class="input mono" name="stackTrace" rows="4" spellcheck="false">${m.stackTrace}</textarea></label>
      <label class="field field--wide"><span class="field__label">Root cause</span><textarea class="input" name="rootCause" rows="2" placeholder="Why did it happen?">${m.rootCause}</textarea></label>
      <label class="field field--wide"><span class="field__label">Solution</span><textarea class="input" name="solution" rows="3" placeholder="What fixed it? Be specific enough that future-you can repeat it.">${m.solution}</textarea></label>
      <label class="field field--wide"><span class="field__label">Commands <span class="muted">(one per line)</span></span><textarea class="input mono" name="commands" rows="3" spellcheck="false">${(m.commands || []).join('\n')}</textarea></label>
      <label class="field field--wide"><span class="field__label">Notes</span><textarea class="input" name="content" rows="4" placeholder="Anything else worth remembering">${m.content}</textarea></label>
      <div class="field field--wide" data-tags></div>
      <label class="field"><span class="field__label">Language</span><select class="input" name="language"><option value="">—</option>${SNIPPET_LANGUAGES.map((l) => html`<option value="${l}" ${l === m.language ? 'selected' : ''}>${LANGUAGE_LABELS[l]}</option>`)}</select></label>
      <label class="field"><span class="field__label">Framework</span><input class="input" name="framework" value="${m.framework}" placeholder="Django, React…"></label>
      <label class="field field--wide"><span class="field__label">Source URL</span><input class="input" name="sourceUrl" type="url" value="${m.sourceUrl}" placeholder="https://stackoverflow.com/…"></label>
      <fieldset class="field field--wide fieldset"><legend class="field__label">Images</legend>
        <div class="uploader" data-uploader></div>
      </fieldset>
    </form>
    <div class="editor-bar">
      <button type="button" class="btn btn--ghost" data-cancel>Cancel</button>
      <button type="button" class="btn btn--primary" data-save>${isEdit ? 'Save changes' : 'Save memory'}</button>
    </div>
  </div>`);

  const form = el.querySelector('form');
  const dupes = el.querySelector('[data-dupes]');
  const uploader = el.querySelector('[data-uploader]');
  const tagCtl = mountTagInput(el.querySelector('[data-tags]'), { value: m.tags, suggestions: allTags(d), onChange: () => { dirty = true; } });
  let dupesDismissed = isEdit;

  const paintUploader = (progress = null) => {
    const canUpload = ctx.mode === 'user' && isStorageConfigured && memoryId;
    render(uploader, html`
      ${attachments.length ? html`<ul class="thumbs">${attachments.map((a, i) => html`<li class="thumb-edit"><img src="${safeUrl(a.url)}" alt="${a.name}" loading="lazy"><button type="button" class="icon-btn icon-btn--sm" data-rm-att="${i}" aria-label="Remove ${a.name}">${icon('x', { size: 14 })}</button></li>`)}</ul>` : ''}
      ${progress != null ? html`<div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(progress * 100)}" aria-label="Uploading"><span style="width:${Math.round(progress * 100)}%"></span></div>` : ''}
      <label class="dropzone ${canUpload ? '' : 'is-disabled'}">
        ${icon('image', { size: 18 })}<span>${canUpload ? 'Add screenshot or diagram (PNG, JPEG, GIF, WebP · max 5 MB)' : ctx.mode === 'demo' ? 'Create an account to attach images' : 'Image uploads need Firebase Storage configured'}</span>
        <input type="file" accept="image/png,image/jpeg,image/gif,image/webp" data-file ${canUpload ? '' : 'disabled'} class="visually-hidden">
      </label>`);
  };
  paintUploader();

  const syncType = () => { form.dataset.type = form.elements.type.value; };
  form.elements.type.addEventListener('change', syncType);
  syncType();

  const checkDupes = debounce(() => {
    if (dupesDismissed) return;
    const data = formData(form);
    const matches = memoryService.findDuplicates({ ...data, tags: tagCtl.get() }, { excludeId: existing?.id });
    render(dupes, duplicatePanel(matches));
  }, 300);
  form.addEventListener('input', (e) => { dirty = true; if (['title', 'problem', 'errorMessage'].includes(e.target.name)) checkDupes(); });
  if (draft) checkDupes();

  const collect = () => {
    const data = formData(form);
    return { ...data, commands: splitLines(data.commands), tags: tagCtl.get(), attachments, status: data.type === 'BUG' ? data.status : (existing?.status && !BUG_STATUSES.includes(existing.status) ? existing.status : 'active') };
  };

  const save = () => runAction(() => {
    const data = collect();
    if (!data.title.trim()) { toast('Give the memory a title', { type: 'info' }); form.elements.title.focus(); return; }
    let id;
    if (isEdit) id = memoryService.update(existing.id, data);
    // keep the pre-generated id so uploaded images live under users/{uid}/attachments/{memoryId}/
    else id = memoryService.create(data, { id: memoryId || undefined });
    saved = true;
    location.hash = `#/memories/${id}`;
  }, 'save memory');

  el.querySelector('[data-save]').addEventListener('click', save);
  form.addEventListener('submit', (e) => { e.preventDefault(); save(); });
  el.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); save(); } });
  el.querySelector('[data-cancel]').addEventListener('click', async () => {
    if (dirty && !(await confirmDialog({ title: 'Discard changes?', message: 'Your edits to this memory haven’t been saved.', confirmLabel: 'Discard', danger: true }))) return;
    history.length > 1 ? history.back() : (location.hash = isEdit ? `#/memories/${existing.id}` : '#/memories');
  });

  dupes.addEventListener('click', (e) => {
    const open = e.target.closest('[data-dupe-open]');
    const merge = e.target.closest('[data-dupe-merge]');
    if (open) location.hash = `#/memories/${open.dataset.dupeOpen}`;
    else if (merge) runAction(() => { memoryService.merge(merge.dataset.dupeMerge, collect()); saved = true; toast('Merged into the existing memory ✓', { type: 'success' }); location.hash = `#/memories/${merge.dataset.dupeMerge}`; });
    else if (e.target.closest('[data-dupe-dismiss]')) { dupesDismissed = true; render(dupes, html``); }
  });

  uploader.addEventListener('change', async (e) => {
    const input = e.target.closest('[data-file]');
    const file = input?.files?.[0];
    if (!file) return;
    input.value = '';
    try {
      paintUploader(0);
      const meta = await attachmentService.upload(memoryId, file, (p) => paintUploader(p));
      attachments.push(meta);
      uploadedThisSession.push(meta);
      dirty = true;
      if (isEdit) memoryService.update(existing.id, { attachments }, { silent: true });
      toast('Image attached ✓', { type: 'success' });
    } catch (err) { reportError(err, 'upload'); }
    paintUploader();
  });
  uploader.addEventListener('click', (e) => {
    const rm = e.target.closest('[data-rm-att]');
    if (!rm) return;
    const a = attachments[Number(rm.dataset.rmAtt)];
    runAction(async () => {
      await attachmentService.remove(a);
      attachments = attachments.filter((x) => x.path !== a.path);
      if (isEdit) memoryService.update(existing.id, { attachments }, { silent: true });
      paintUploader();
    });
  });

  return () => {
    checkDupes.cancel();
    // New memory abandoned after uploading images: clean the orphaned files up.
    if (!saved && !isEdit && uploadedThisSession.length) uploadedThisSession.forEach((a) => attachmentService.remove(a).catch(() => {}));
  };
}
