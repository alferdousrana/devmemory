/**
 * Data ownership: export everything (JSON / Markdown), import backups,
 * delete all data. Nothing is ever destroyed silently.
 */
import { getContext, requireWritable } from './context.js';
import { dataStore } from '../state/dataStore.js';
import { authState } from '../state/authState.js';
import { COLLECTION_NAMES, sanitize, TYPE_META } from '../data/schema.js';
import { downloadFile } from '../utils/files.js';
import { isoDate, formatDate } from '../utils/date.js';
import { codedError } from '../utils/errors.js';
import { log } from './activityService.js';
import { attachmentService } from './attachmentService.js';
import { track } from '../firebase/analytics.js';

const FORMAT_VERSION = 1;
const ID_RE = /^[A-Za-z0-9_-]{1,128}$/;

async function collectAll() {
  const ctx = getContext();
  const data = {};
  for (const name of COLLECTION_NAMES) {
    if (ctx.mode === 'user') {
      try { data[name] = await ctx.repos[name].getAll(ctx.uid); continue; } catch { /* offline: fall back to cache */ }
    }
    data[name] = dataStore.get()[name];
  }
  return data;
}

const iso = (v) => (v ? new Date(v).toISOString() : null);

export function serializeRecords(records) {
  return records.map((r) => {
    const out = { ...r };
    for (const k of Object.keys(out)) if (/At$/.test(k)) out[k] = iso(out[k]);
    return out;
  });
}

export async function buildBackup() {
  const data = await collectAll();
  const { profile } = authState.get();
  const serialized = {};
  for (const [k, v] of Object.entries(data)) serialized[k] = serializeRecords(v);
  return {
    app: 'DevMemory',
    formatVersion: FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    profile: profile ? {
      displayName: profile.displayName, email: profile.email,
      primaryTechnologies: profile.primaryTechnologies || [], currentProjects: profile.currentProjects || [],
    } : null,
    data: serialized,
  };
}

export function backupToMarkdown(backup) {
  const d = backup.data;
  const projectName = (id) => d.projects.find((p) => p.id === id)?.name;
  const lines = [`# DevMemory export`, '', `Exported ${backup.exportedAt}`, ''];
  const section = (title) => lines.push('', `## ${title}`, '');
  const fence = (code, lang = '') => { lines.push(`\`\`\`${lang}`, String(code).replace(/```/g, '``\u200b`'), '```'); };
  section(`Memories (${d.memories.length})`);
  for (const m of d.memories) {
    lines.push(`### ${m.title}`, '', `- Type: ${TYPE_META[m.type]?.label || m.type}`, `- Status: ${m.status}`);
    if (m.tags?.length) lines.push(`- Tags: ${m.tags.map((t) => `#${t}`).join(' ')}`);
    if (m.projectId && projectName(m.projectId)) lines.push(`- Project: ${projectName(m.projectId)}`);
    lines.push(`- Created: ${m.createdAt || ''}`, '');
    if (m.problem) lines.push('**Problem**', '', m.problem, '');
    if (m.errorMessage) { lines.push('**Error message**', ''); fence(m.errorMessage); lines.push(''); }
    if (m.stackTrace) { lines.push('**Stack trace**', ''); fence(m.stackTrace); lines.push(''); }
    if (m.rootCause) lines.push('**Root cause**', '', m.rootCause, '');
    if (m.solution) lines.push('**Solution**', '', m.solution, '');
    if (m.commands?.length) { lines.push('**Commands**', ''); fence(m.commands.join('\n'), 'bash'); lines.push(''); }
    if (m.content && m.content !== m.problem) lines.push('**Notes**', '', m.content, '');
  }
  section(`Snippets (${d.snippets.length})`);
  for (const s of d.snippets) {
    lines.push(`### ${s.title}`, '');
    if (s.description) lines.push(s.description, '');
    fence(s.code, s.language === 'plaintext' ? '' : s.language);
    lines.push('');
  }
  section(`Commands (${d.commands.length})`);
  for (const c of d.commands) {
    lines.push(`- \`${c.command.replace(/`/g, "'")}\`${c.description ? ` — ${c.description}` : ''}${c.category ? ` (${c.category})` : ''}`);
  }
  section(`Projects (${d.projects.length})`);
  for (const p of d.projects) {
    lines.push(`### ${p.name}`, '');
    if (p.description) lines.push(p.description, '');
    if (p.techStack?.length) lines.push(`Stack: ${p.techStack.join(', ')}`, '');
    if (p.repoUrl) lines.push(`Repository: ${p.repoUrl}`);
    if (p.liveUrl) lines.push(`Live: ${p.liveUrl}`);
    const cmds = [p.runCommand, p.backendCommand, p.frontendCommand, ...(p.importantCommands || [])].filter(Boolean);
    if (cmds.length) { lines.push(''); fence(cmds.join('\n'), 'bash'); }
    if (p.architecture) lines.push('', '**Architecture**', '', p.architecture);
    if (p.deployment) lines.push('', '**Deployment**', '', p.deployment);
    lines.push('');
  }
  section(`Bookmarks (${d.bookmarks.length})`);
  for (const b of d.bookmarks) lines.push(`- [${b.title.replace(/[[\]]/g, '')}](${b.url})${b.description ? ` — ${b.description}` : ''}`);
  return lines.join('\n');
}

export const backupService = {
  async exportJSON() {
    const backup = await buildBackup();
    downloadFile(`devmemory-backup-${isoDate()}.json`, JSON.stringify(backup, null, 2));
    log('backup_exported', 'Exported a JSON backup');
    track('backup_exported');
    return backup;
  },

  async exportMarkdown() {
    const backup = await buildBackup();
    downloadFile(`devmemory-backup-${isoDate()}.md`, backupToMarkdown(backup), 'text/markdown');
    log('backup_exported', 'Exported a Markdown backup');
    return backup;
  },

  /** Validate a backup file and describe what importing it would do. */
  analyze(text) {
    let parsed;
    try { parsed = JSON.parse(text); } catch { throw codedError('import/invalid'); }
    if (!parsed || parsed.app !== 'DevMemory' || typeof parsed.data !== 'object') throw codedError('import/invalid');
    const current = dataStore.get();
    const summary = [];
    let total = 0; let conflicts = 0;
    for (const name of COLLECTION_NAMES) {
      const recs = Array.isArray(parsed.data[name]) ? parsed.data[name] : [];
      const ids = new Set(current[name].map((r) => r.id));
      const existing = recs.filter((r) => r && ids.has(r.id)).length;
      total += recs.length; conflicts += existing;
      if (recs.length) summary.push({ name, count: recs.length, existing });
    }
    return { backup: parsed, summary, total, conflicts, exportedAt: parsed.exportedAt ? formatDate(Date.parse(parsed.exportedAt)) : 'unknown date' };
  },

  /**
   * @param {'merge'|'overwrite'} mode merge = add only records you don't have; overwrite = also replace matching ids
   */
  async importBackup(backup, mode = 'merge') {
    const { uid, repos } = requireWritable();
    const current = dataStore.get();
    let written = 0;
    for (const name of COLLECTION_NAMES) {
      const recs = Array.isArray(backup.data[name]) ? backup.data[name] : [];
      const existing = new Set(current[name].map((r) => r.id));
      const toWrite = recs
        .filter((r) => r && typeof r === 'object')
        // reviews/activity are append-only (rules forbid updates), so existing ids are always skipped
        .filter((r) => !existing.has(r.id) || (mode === 'overwrite' && !['reviews', 'activity'].includes(name)))
        .map((r) => {
          const clean = sanitize(name, { ...r, userId: uid }, { partial: name === 'reviews' || name === 'activity' });
          if (name === 'reviews' && (!clean.memoryId || !clean.rating)) return null;
          if (name === 'activity' && (!clean.type || !clean.message)) return null;
          return { ...clean, id: ID_RE.test(r.id || '') ? r.id : undefined };
        })
        .filter(Boolean);
      if (!toWrite.length) continue;
      const pending = repos[name].importMany(uid, toWrite);
      // Offline: the batch is queued locally and committed when back online.
      if (navigator.onLine !== false) await pending; else pending.catch(() => {});
      written += toWrite.length;
    }
    log('backup_imported', `Imported ${written} records from a backup`);
    return written;
  },

  /** Delete every record (keeps the account). */
  async deleteAllData() {
    const { uid, repos } = requireWritable();
    let removed = 0;
    for (const name of COLLECTION_NAMES) removed += await repos[name].deleteAll(uid);
    removed += await attachmentService.deleteAll();
    return removed;
  },
};
