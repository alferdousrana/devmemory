import { createEntityService } from './entityService.js';
import { buildSearchKeywords, normalizeTags } from '../utils/keywords.js';
import { codedError } from '../utils/errors.js';
import { dataStore } from '../state/dataStore.js';
import { DAY } from '../utils/date.js';

function prepare(r) {
  const out = {
    ...r,
    name: String(r.name || '').trim(),
    tags: normalizeTags(r.tags),
    techStack: (Array.isArray(r.techStack) ? r.techStack : String(r.techStack || '').split(','))
      .map((t) => String(t).trim()).filter(Boolean),
  };
  if (!out.name) throw codedError('invalid-argument', 'Give the project a name.');
  for (const k of ['repoUrl', 'liveUrl']) {
    const v = String(out[k] || '').trim();
    out[k] = v && !/^https?:\/\//i.test(v) ? `https://${v}` : v;
  }
  out.searchKeywords = buildSearchKeywords(out.name, out.description, out.techStack, out.tags, out.database, out.architecture?.slice(0, 1000));
  return out;
}

const base = createEntityService({
  collection: 'projects', label: 'Project', kind: 'project', prepare, describe: (r) => r.name,
});

export const projectService = {
  ...base,
  /** Everything linked to a project — the project's "brain". */
  context(projectId) {
    const d = dataStore.get();
    const memories = d.memories.filter((m) => m.projectId === projectId);
    const bugs = memories.filter((m) => m.type === 'BUG');
    return {
      memories,
      bugs,
      openBugs: bugs.filter((b) => b.status !== 'resolved'),
      importantMemories: memories.filter((m) => m.isFavorite || m.type !== 'BUG'),
      snippets: d.snippets.filter((s) => s.projectId === projectId),
      commands: d.commands.filter((c) => c.projectId === projectId),
      bookmarks: d.bookmarks.filter((b) => b.projectId === projectId),
    };
  },
  /** Reasons a project might need attention (empty array = healthy). */
  attentionReasons(project, now = Date.now()) {
    if (!project || ['archived', 'shipped'].includes(project.status)) return [];
    const reasons = [];
    const ctx = projectService.context(project.id);
    if (ctx.openBugs.length) reasons.push(`${ctx.openBugs.length} open bug${ctx.openBugs.length > 1 ? 's' : ''}`);
    if (!project.runCommand && !project.backendCommand && !project.frontendCommand) reasons.push('no run command saved');
    if (!project.deployment && project.status === 'active') reasons.push('deployment steps missing');
    if (project.updatedAt && now - project.updatedAt > 45 * DAY) reasons.push('not updated in 45 days');
    return reasons;
  },
  nameOf(id) { return base.get(id)?.name || ''; },
};
