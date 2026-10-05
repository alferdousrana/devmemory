/** Settings: account, appearance, notifications, shortcuts, data, privacy, preferences, danger zone. */
import { html, render } from '../utils/html.js';
import { icon } from '../components/icons.js';
import { pageHeader } from '../components/ui.js';
import { openModal, confirmDialog } from '../components/modal.js';
import { authState } from '../state/authState.js';
import { dataStore } from '../state/dataStore.js';
import { authService } from '../services/authService.js';
import { profileService, TECH_CHOICES } from '../services/profileService.js';
import { backupService } from '../services/backupService.js';
import { runAction, toast, reportError } from '../services/notify.js';
import { notificationsSupported, requestPermission } from '../services/reminderService.js';
import { getPref, setPref, clearPrefs } from '../utils/prefs.js';
import { setTheme } from '../utils/theme.js';
import { readFileAsText } from '../utils/files.js';
import { modKey } from '../utils/dom.js';
import { MEMORY_TYPES, TYPE_META } from '../data/schema.js';
import { initAnalytics } from '../firebase/analytics.js';

const SECTIONS = [['account', 'Account'], ['appearance', 'Appearance'], ['notifications', 'Notifications'], ['shortcuts', 'Keyboard shortcuts'], ['data', 'Data & backup'], ['privacy', 'Privacy'], ['developer', 'Developer preferences'], ['danger', 'Danger zone']];

export default function settingsPage(el) {
  const a = authState.get();
  const demo = a.mode === 'demo';
  const p = a.profile || {};
  const s = profileService.settings();
  const isPassword = authService.providerIds().includes('password');
  const k = modKey();
  const theme = getPref('theme');
  const perm = notificationsSupported() ? Notification.permission : 'unsupported';

  render(el, html`<div class="page settings">
    ${pageHeader({ title: 'Settings' })}
    ${demo ? html`<aside class="notice">${icon('eye', { size: 16 })}<div>You’re in the demo. Settings that save data are disabled — <a href="#/register">create an account</a> to keep yours.</div></aside>` : ''}
    <div class="settings__layout">
      <nav class="settings__nav" aria-label="Settings sections"><ul>${SECTIONS.map(([id, label]) => html`<li><a href="#/settings" data-jump="${id}">${label}</a></li>`)}</ul></nav>
      <div class="settings__body">

        <section class="panel" id="s-account"><h2 class="panel__title">Account</h2>
          <form class="inline-form" data-name-form><label class="field"><span class="field__label">Display name</span><input class="input" name="name" value="${p.displayName || ''}" ${demo ? 'disabled' : ''}></label><button class="btn btn--ghost" type="submit" ${demo ? 'disabled' : ''}>Save</button></form>
          <dl class="kv"><div><dt>Email</dt><dd>${p.email || '—'}</dd></div><div><dt>Sign-in method</dt><dd>${a.currentUser?.providerIds?.map((x) => (x === 'google.com' ? 'Google' : x === 'password' ? 'Email & password' : x)).join(', ') || '—'}</dd></div></dl>
          <div class="btn-row">${isPassword ? html`<button type="button" class="btn btn--ghost" data-reset-pw>${icon('mail', { size: 15 })}Email me a password reset link</button>` : ''}
            <button type="button" class="btn btn--ghost" data-signout>${icon('logout', { size: 15 })}${demo ? 'Exit demo' : 'Sign out'}</button></div>
        </section>

        <section class="panel" id="s-appearance"><h2 class="panel__title">Appearance</h2>
          <fieldset class="radio-cards"><legend class="field__label">Theme</legend>
            ${[['dark', 'Dark', 'moon'], ['light', 'Light', 'sun'], ['system', 'System', 'sliders']].map(([v, label, ic]) => html`<label class="radio-card"><input type="radio" name="theme" value="${v}" ${theme === v ? 'checked' : ''}><span>${icon(ic, { size: 16 })}${label}</span></label>`)}
          </fieldset>
        </section>

        <section class="panel" id="s-notifications"><h2 class="panel__title">Notifications</h2>
          <label class="switch"><input type="checkbox" data-reminders ${s.reviewReminders ? 'checked' : ''} ${demo ? 'disabled' : ''}><span>Remind me when memories are due for review</span></label>
          <p class="muted small">DevMemory shows at most one browser notification a day, while the app is open. There are no emails or server push.</p>
          <p class="small">Browser permission: <strong data-perm>${perm === 'granted' ? 'allowed' : perm === 'denied' ? 'blocked in browser settings' : perm === 'unsupported' ? 'not supported here' : 'not asked yet'}</strong>
            ${perm === 'default' ? html`<button type="button" class="btn btn--tiny btn--ghost" data-ask-perm>Allow notifications</button>` : ''}</p>
          <label class="field field--inline"><span class="field__label">Daily review goal</span><input class="input input--sm" type="number" min="1" max="200" data-goal value="${s.dailyReviewGoal}" ${demo ? 'disabled' : ''}></label>
        </section>

        <section class="panel" id="s-shortcuts"><h2 class="panel__title">Keyboard shortcuts</h2>
          <dl class="shortcuts">
            <div><dt>Quick capture (any page)</dt><dd><kbd>${k}</kbd><kbd>Shift</kbd><kbd>M</kbd> or <kbd>C</kbd></dd></div>
            <div><dt>Command palette</dt><dd><kbd>${k}</kbd><kbd>Shift</kbd><kbd>P</kbd> or <kbd>${k}</kbd><kbd>K</kbd> or <kbd>/</kbd></dd></div>
            <div><dt>Save in editors</dt><dd><kbd>${k}</kbd><kbd>Enter</kbd></dd></div>
            <div><dt>Review: reveal / rate / forgot</dt><dd><kbd>Space</kbd> · <kbd>1</kbd>–<kbd>4</kbd> · <kbd>F</kbd></dd></div>
            <div><dt>Close dialogs</dt><dd><kbd>Esc</kbd></dd></div>
            <div><dt>Memory graph: pan / zoom</dt><dd><kbd>←</kbd><kbd>↑</kbd><kbd>→</kbd><kbd>↓</kbd> · <kbd>+</kbd><kbd>−</kbd></dd></div>
          </dl>
          <p class="muted small">Some browsers reserve ${k}+Shift+M or ${k}+Shift+P (Firefox uses the latter for private windows). The single-key alternatives always work when you’re not typing.</p>
        </section>

        <section class="panel" id="s-data"><h2 class="panel__title">Data &amp; backup</h2>
          <p class="muted small">Your data is yours. Exports include every memory, snippet, command, project, bookmark, collection, review and activity record.</p>
          <div class="btn-row">
            <button type="button" class="btn btn--ghost" data-export-json>${icon('download', { size: 15 })}Export everything (JSON)</button>
            <button type="button" class="btn btn--ghost" data-export-md>${icon('download', { size: 15 })}Export as Markdown</button>
            <label class="btn btn--ghost ${demo ? 'is-disabled' : ''}">${icon('upload', { size: 15 })}Import backup<input type="file" accept="application/json,.json" class="visually-hidden" data-import ${demo ? 'disabled' : ''}></label>
          </div>
        </section>

        <section class="panel" id="s-privacy"><h2 class="panel__title">Privacy</h2>
          <label class="switch"><input type="checkbox" data-analytics ${getPref('analyticsOptIn') ? 'checked' : ''}><span>Share anonymous usage events to help improve DevMemory</span></label>
          <p class="muted small">Only event names like “memory created” — never titles, content, code or searches. Has no effect unless the deployment configured Analytics.</p>
          <div class="btn-row"><a class="btn btn--ghost" href="#/privacy">${icon('shield', { size: 15 })}Read the privacy page</a><button type="button" class="btn btn--ghost" data-clear-prefs>Clear preferences on this device</button></div>
        </section>

        <section class="panel" id="s-developer"><h2 class="panel__title">Developer preferences</h2>
          <form class="form-grid" data-dev-form>
            <label class="field"><span class="field__label">Default type for new memories</span><select class="input" name="defaultMemoryType" ${demo ? 'disabled' : ''}>${MEMORY_TYPES.map((t) => html`<option value="${t}" ${t === s.defaultMemoryType ? 'selected' : ''}>${TYPE_META[t].label}</option>`)}</select></label>
            <label class="field"><span class="field__label">Editor tab size</span><select class="input" name="editorTabSize" ${demo ? 'disabled' : ''}>${[2, 4].map((n) => html`<option value="${n}" ${n === s.editorTabSize ? 'selected' : ''}>${n} spaces</option>`)}</select></label>
            <fieldset class="field field--wide fieldset"><legend class="field__label">Primary technologies</legend>
              <div class="chips-pick">${[...new Set([...TECH_CHOICES, ...(p.primaryTechnologies || [])])].map((t) => html`<label class="chip-toggle"><input type="checkbox" name="tech" value="${t}" ${(p.primaryTechnologies || []).includes(t) ? 'checked' : ''} ${demo ? 'disabled' : ''}><span>${t}</span></label>`)}</div></fieldset>
            <div class="field--wide"><button type="submit" class="btn btn--primary" ${demo ? 'disabled' : ''}>Save preferences</button></div>
          </form>
        </section>

        <section class="panel panel--danger" id="s-danger"><h2 class="panel__title">Danger zone</h2>
          <div class="danger-row"><div><strong>Delete all data</strong><p class="muted small">Removes every memory, snippet, command, project, bookmark, collection, review, activity record and image. Your account stays.</p></div>
            <button type="button" class="btn btn--danger-outline" data-delete-data ${demo ? 'disabled' : ''}>Delete all data</button></div>
          <div class="danger-row"><div><strong>Delete account</strong><p class="muted small">Permanently deletes your data, images and sign-in account. Export a backup first if you might want it later.</p></div>
            <button type="button" class="btn btn--danger-outline" data-delete-account ${demo ? 'disabled' : ''}>Delete account</button></div>
        </section>
      </div>
    </div>
  </div>`);

  el.querySelector('[data-name-form]').addEventListener('submit', (e) => { e.preventDefault(); runAction(() => profileService.rename(e.target.elements.name.value)); });
  el.querySelectorAll('input[name="theme"]').forEach((r) => r.addEventListener('change', () => {
    setTheme(r.value); toast(`Theme: ${r.value}`);
    if (authState.get().mode === 'user') runAction(() => profileService.update({ theme: r.value }));
  }));
  el.querySelector('[data-reminders]').addEventListener('change', (e) => runAction(async () => {
    profileService.saveSettings({ reviewReminders: e.target.checked });
    if (e.target.checked && notificationsSupported() && Notification.permission === 'default') await requestPermission();
  }));
  el.querySelector('[data-goal]').addEventListener('change', (e) => runAction(() => profileService.saveSettings({ dailyReviewGoal: Math.max(1, Math.min(200, Number(e.target.value) || 10)) })));
  el.querySelector('[data-analytics]').addEventListener('change', (e) => { setPref('analyticsOptIn', e.target.checked); if (e.target.checked) initAnalytics(); toast(e.target.checked ? 'Thanks — anonymous events on' : 'Analytics off. Takes full effect after reload.'); });
  el.querySelector('[data-dev-form]').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target;
    runAction(() => {
      profileService.saveSettings({ defaultMemoryType: f.elements.defaultMemoryType.value, editorTabSize: Number(f.elements.editorTabSize.value) });
      profileService.update({ primaryTechnologies: [...f.querySelectorAll('input[name="tech"]:checked')].map((x) => x.value) });
    });
  });
  el.querySelector('[data-import]').addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const report = backupService.analyze(await readFileAsText(file));
      openImportDialog(report);
    } catch (err) { reportError(err, 'import'); }
  });

  el.addEventListener('click', async (e) => {
    const t = e.target;
    const jump = t.closest('[data-jump]');
    if (jump) { e.preventDefault(); const target = el.querySelector(`#s-${jump.dataset.jump}`); target?.scrollIntoView({ behavior: 'smooth', block: 'start' }); target?.querySelector('h2')?.focus?.(); return; }
    if (t.closest('[data-signout]')) {
      runAction(async () => { await authService.signOut(); location.hash = '#/'; });
    } else if (t.closest('[data-reset-pw]')) {
      runAction(async () => { await authService.resetPassword(authState.get().profile.email); toast('Reset link sent. Check your inbox.', { type: 'success' }); });
    } else if (t.closest('[data-ask-perm]')) {
      const r = await requestPermission();
      el.querySelector('[data-perm]').textContent = r === 'granted' ? 'allowed' : r === 'denied' ? 'blocked in browser settings' : 'not asked yet';
      t.closest('[data-ask-perm]').remove();
    } else if (t.closest('[data-export-json]')) {
      runAction(async () => { await backupService.exportJSON(); toast('Backup exported ✓', { type: 'success' }); });
    } else if (t.closest('[data-export-md]')) {
      runAction(async () => { await backupService.exportMarkdown(); toast('Markdown exported ✓', { type: 'success' }); });
    } else if (t.closest('[data-clear-prefs]')) {
      if (await confirmDialog({ title: 'Clear preferences on this device?', message: 'Resets theme, dashboard layout and recent searches in this browser. Your saved data isn’t affected.', confirmLabel: 'Clear' })) { clearPrefs(); setTheme('dark'); toast('Preferences cleared'); }
    } else if (t.closest('[data-delete-data]')) {
      await deleteAllDataFlow();
    } else if (t.closest('[data-delete-account]')) {
      await deleteAccountFlow(isPassword);
    }
  });
}

function openImportDialog(report) {
  const m = openModal({
    title: 'Import backup',
    size: 'md',
    body: html`<p>Backup from <strong>${report.exportedAt}</strong> with ${report.total} records.</p>
      <table class="table"><thead><tr><th scope="col">Type</th><th scope="col">In backup</th><th scope="col">Already here</th></tr></thead>
      <tbody>${report.summary.map((r) => html`<tr><td>${r.name}</td><td>${r.count}</td><td>${r.existing}</td></tr>`)}</tbody></table>
      <aside class="notice notice--warn">${icon('alert', { size: 16 })}<div>This may add or overwrite records in your account. Consider exporting a backup first.</div></aside>
      <fieldset class="radio-cards radio-cards--stack"><legend class="field__label">How to import</legend>
        <label class="radio-card"><input type="radio" name="mode" value="merge" checked><span><strong>Add new only</strong> — skip ${report.conflicts} record${report.conflicts === 1 ? '' : 's'} you already have</span></label>
        <label class="radio-card"><input type="radio" name="mode" value="overwrite"><span><strong>Add and overwrite</strong> — replace your ${report.conflicts} matching record${report.conflicts === 1 ? '' : 's'} with the backup’s version</span></label>
      </fieldset>`,
    footer: html`<button type="button" class="btn btn--ghost" data-close>Cancel</button><button type="button" class="btn btn--primary" data-go>Import</button>`,
  });
  m.root.querySelector('[data-go]').addEventListener('click', async (e) => {
    const mode = m.root.querySelector('input[name="mode"]:checked').value;
    if (mode === 'overwrite' && report.conflicts && !(await confirmDialog({ title: 'Overwrite matching records?', message: `${report.conflicts} of your current records will be replaced by the backup’s version.`, confirmLabel: 'Overwrite', danger: true }))) return;
    e.target.disabled = true; e.target.classList.add('is-busy');
    await runAction(async () => {
      const n = await backupService.importBackup(report.backup, mode);
      toast(navigator.onLine === false ? `Imported ${n} records locally — they’ll sync when you’re online.` : `Imported ${n} records ✓`, { type: 'success' });
      m.close();
    }, 'import');
    e.target.disabled = false; e.target.classList.remove('is-busy');
  });
}

async function deleteAllDataFlow() {
  const d = dataStore.get();
  const ok1 = await confirmDialog({
    title: 'Delete all your data?',
    message: `This permanently deletes ${d.memories.length} memories, ${d.snippets.length} snippets, ${d.commands.length} commands, ${d.projects.length} projects, ${d.bookmarks.length} bookmarks and all images. There is no undo.`,
    confirmLabel: 'Continue', danger: true,
  });
  if (!ok1) return;
  const ok2 = await confirmDialog({ title: 'Are you sure?', message: 'Type DELETE to permanently remove all data. Your account will stay.', confirmLabel: 'Delete all data', danger: true, requireText: 'DELETE' });
  if (!ok2) return;
  if (navigator.onLine === false) { toast('Deleting everything needs a connection. Try again when you’re online.', { type: 'offline' }); return; }
  await runAction(async () => {
    toast('Deleting…');
    const n = await backupService.deleteAllData();
    toast(`Deleted ${n} items`, { type: 'success' });
  }, 'delete all data');
}

async function deleteAccountFlow(isPassword) {
  const ok1 = await confirmDialog({
    title: 'Delete your DevMemory account?',
    message: 'Everything you saved — memories, snippets, commands, projects, bookmarks, collections, reviews, activity and images — will be permanently deleted, along with your sign-in. This can’t be undone. Export a backup first if you might want your data later.',
    confirmLabel: 'I understand, continue', danger: true,
  });
  if (!ok1) return;
  const m = openModal({
    title: 'Confirm account deletion',
    size: 'sm',
    body: html`<form data-del novalidate>
      <p class="dialog-message">For your security, confirm it’s you. ${isPassword ? 'Enter your password.' : 'You’ll be asked to sign in with Google again.'}</p>
      ${isPassword ? html`<label class="field"><span class="field__label">Password</span><input class="input" type="password" name="password" autocomplete="current-password" required></label>` : ''}
      <label class="field"><span class="field__label">Type <code>DELETE</code> to confirm</span><input class="input" name="confirm" autocomplete="off" autocapitalize="off" spellcheck="false" autofocus></label>
      <p class="form-error" role="alert" data-err hidden></p></form>`,
    footer: html`<button type="button" class="btn btn--ghost" data-close>Cancel</button><button type="button" class="btn btn--danger" data-go disabled>Delete my account</button>`,
  });
  const form = m.root.querySelector('[data-del]');
  const go = m.root.querySelector('[data-go]');
  const err = m.root.querySelector('[data-err]');
  form.addEventListener('input', () => { go.disabled = form.elements.confirm.value.trim() !== 'DELETE' || (isPassword && !form.elements.password.value); });
  form.addEventListener('submit', (e) => e.preventDefault());
  go.addEventListener('click', async () => {
    if (navigator.onLine === false) { err.textContent = 'Account deletion needs a connection.'; err.hidden = false; return; }
    go.disabled = true; go.classList.add('is-busy'); err.hidden = true;
    try {
      await authService.deleteAccount({ password: isPassword ? form.elements.password.value : undefined });
      m.close();
      location.hash = '#/';
      toast('Your account and data were deleted.', { type: 'info', duration: 7000 });
    } catch (e) {
      const { humanizeError } = await import('../utils/errors.js');
      err.textContent = humanizeError(e); err.hidden = false;
      go.disabled = false; go.classList.remove('is-busy');
    }
  });
}
