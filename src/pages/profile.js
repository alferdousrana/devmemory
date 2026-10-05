/** Profile overview. */
import { html, render } from '../utils/html.js';
import { icon } from '../components/icons.js';
import { pageHeader, avatar } from '../components/ui.js';
import { watch } from '../components/reactive.js';
import { effectiveStreak } from '../services/activityService.js';
import { attachmentService } from '../services/attachmentService.js';
import { formatDate } from '../utils/date.js';

const fmtBytes = (b) => (b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1048576).toFixed(1)} MB`);

export default function profilePage(el) {
  el.innerHTML = '<div class="page page--narrow"></div>';
  const page = el.firstElementChild;
  return watch((d, a) => {
    const p = a.profile || {};
    const usage = attachmentService.usage(d.memories);
    render(page, html`${pageHeader({ title: 'Profile', actions: html`<a class="btn btn--sm btn--ghost" href="#/settings">${icon('sliders', { size: 15 })}Settings</a>` })}
      <section class="panel profile">
        <div class="profile__id">${avatar(p, 64)}<div><h2 class="profile__name">${p.displayName || 'Developer'}</h2><p class="muted">${p.email || (a.mode === 'demo' ? 'Demo account' : '')}</p></div></div>
        <dl class="kv kv--grid">
          <div><dt>Member since</dt><dd>${formatDate(p.createdAt || a.currentUser?.createdAt)}</dd></div>
          <div><dt>Memories</dt><dd>${d.memories.length}</dd></div>
          <div><dt>Review streak</dt><dd>🔥 ${effectiveStreak(p)} days <span class="muted small">(best ${p.longestStreak || 0})</span></dd></div>
          <div><dt>Attachments</dt><dd>${usage.files} file${usage.files === 1 ? '' : 's'}, ${fmtBytes(usage.bytes)}</dd></div>
        </dl>
      </section>
      <section class="panel"><h2 class="panel__title">Technologies</h2>
        ${(p.primaryTechnologies || []).length ? html`<ul class="stack">${p.primaryTechnologies.map((t) => html`<li class="stack__item">${t}</li>`)}</ul>` : html`<p class="muted small">None chosen. Set them in Settings → Developer preferences.</p>`}</section>
      <section class="panel"><h2 class="panel__title">Projects</h2>
        ${d.projects.length ? html`<ul class="related">${d.projects.map((x) => html`<li><a href="#/projects/${x.id}">${x.name}</a> <span class="muted small">${x.status}</span></li>`)}</ul>` : html`<p class="muted small">No projects yet.</p>`}</section>`);
  }, { auth: true });
}
