import { createEntityService } from './entityService.js';
import { buildSearchKeywords, normalizeTags } from '../utils/keywords.js';
import { codedError } from '../utils/errors.js';
import { DAY } from '../utils/date.js';
import { findSimilarMemories, relatedMemories } from './duplicateService.js';
import { dataStore } from '../state/dataStore.js';
import { log } from './activityService.js';
import { track } from '../firebase/analytics.js';
import { TYPE_META } from '../data/schema.js';

export function memoryKeywords(m) {
  return buildSearchKeywords(
    m.title, m.problem, m.errorMessage, m.rootCause, m.solution, String(m.content || '').slice(0, 3000),
    m.tags, m.language, m.framework, m.commands, m.environment,
  );
}

function prepare(r, current) {
  const out = { ...r, title: String(r.title || '').trim(), tags: normalizeTags(r.tags) };
  if (!out.title) throw codedError('invalid-argument', 'Give the memory a title.');
  if (out.type === 'BUG' && (!out.status || out.status === 'active')) {
    out.status = String(out.solution || '').trim() ? 'resolved' : 'unresolved';
  }
  if (out.type !== 'BUG' && ['unresolved', 'investigating'].includes(out.status)) out.status = 'active';
  if (!current && out.nextReviewAt == null) out.nextReviewAt = Date.now() + DAY;
  out.searchKeywords = memoryKeywords(out);
  return out;
}

const base = createEntityService({
  collection: 'memories',
  label: 'Memory',
  kind: 'memory',
  prepare,
  describe: (r) => r.title,
});

export const memoryService = {
  ...base,
  create(input, opts) {
    const id = base.create(input, { ...opts, activity: false });
    const type = input.type || 'OTHER';
    log(type === 'BUG' ? 'bug_created' : 'memory_created',
      `Saved ${type === 'BUG' ? 'bug' : (TYPE_META[type]?.label || 'memory').toLowerCase()}: ${input.title}`, { refType: 'memory', refId: id });
    track('memory_created', { type });
    return id;
  },
  setStatus(id, status) {
    const m = base.get(id);
    base.update(id, { status }, { silent: true });
    if (status === 'resolved' && m) log('bug_resolved', `Resolved bug: ${m.title}`, { refType: 'memory', refId: id });
  },
  findDuplicates(draft, opts = {}) { return findSimilarMemories(draft, dataStore.get().memories, opts); },
  related(memory, limit = 5) { return relatedMemories(memory, dataStore.get().memories, limit); },
  /** Merge a draft into an existing memory, keeping both versions' details. */
  merge(existingId, draft) {
    const m = base.get(existingId);
    if (!m) throw codedError('not-found');
    const joinText = (a, b) => {
      const A = String(a || '').trim(); const B = String(b || '').trim();
      if (!B || A.includes(B)) return A;
      if (!A) return B;
      return `${A}\n\n---\n${B}`;
    };
    base.update(existingId, {
      content: joinText(m.content, draft.content),
      problem: joinText(m.problem, draft.problem),
      solution: joinText(m.solution, draft.solution),
      rootCause: joinText(m.rootCause, draft.rootCause),
      errorMessage: m.errorMessage || draft.errorMessage || '',
      commands: [...new Set([...(m.commands || []), ...(draft.commands || [])])],
      tags: [...new Set([...(m.tags || []), ...(draft.tags || [])])],
    }, { silent: true });
    return existingId;
  },
};
