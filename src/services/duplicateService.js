/**
 * "I have seen this before" — local similarity between memories.
 * Combines keyword overlap (with synonym expansion, so "Postgres container"
 * matches "PostgreSQL Docker") and Fuse.js fuzzy title matching.
 */
import Fuse from 'fuse.js';
import { buildSearchKeywords, jaccard } from '../utils/keywords.js';

const coreKeywords = (m) => buildSearchKeywords(m.title, m.problem, m.errorMessage, m.tags);

export function findSimilarMemories(draft, memories, { excludeId = null, limit = 3, threshold = 0.32 } = {}) {
  const draftKw = coreKeywords(draft);
  if (draftKw.length < 2 || !memories?.length) return [];
  const candidates = memories.filter((m) => m.id !== excludeId && m.status !== 'archived');
  if (!candidates.length) return [];
  const fuse = new Fuse(candidates, {
    keys: [{ name: 'title', weight: 3 }, { name: 'problem', weight: 1 }, { name: 'errorMessage', weight: 2 }],
    threshold: 0.55, ignoreLocation: true, includeScore: true,
  });
  const fuzzy = new Map(fuse.search(draft.title || draft.problem || '').map((r) => [r.item.id, 1 - r.score]));
  const draftTags = new Set(draft.tags || []);
  return candidates
    .map((m) => {
      const j = jaccard(draftKw, coreKeywords(m));
      const f = fuzzy.get(m.id) || 0;
      const sharedTag = (m.tags || []).some((t) => draftTags.has(t) && t !== 'debugging') ? 1 : 0;
      const sameError = draft.errorMessage && m.errorMessage && draft.errorMessage.trim() === m.errorMessage.trim() ? 1 : 0;
      const score = Math.min(1, 0.55 * j + 0.3 * f + 0.1 * sharedTag + 0.4 * sameError);
      return { memory: m, score, similarity: Math.round(score * 100) };
    })
    .filter((x) => x.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function relatedMemories(memory, memories, limit = 5) {
  if (!memory) return [];
  const kw = memory.searchKeywords?.length ? memory.searchKeywords : buildSearchKeywords(memory.title, memory.problem, memory.tags);
  const tags = new Set((memory.tags || []).filter((t) => t !== 'debugging'));
  return memories
    .filter((m) => m.id !== memory.id && m.status !== 'archived')
    .map((m) => {
      const shared = (m.tags || []).filter((t) => tags.has(t));
      const reasons = [];
      let score = shared.length * 3;
      if (shared.length) reasons.push(`#${shared.slice(0, 2).join(' #')}`);
      if (memory.projectId && m.projectId === memory.projectId) { score += 2; reasons.push('same project'); }
      if (m.type === memory.type) score += 1;
      const j = jaccard(kw, m.searchKeywords || []);
      score += j * 6;
      if (j > 0.2 && !reasons.length) reasons.push('similar topic');
      return { memory: m, score, reasons };
    })
    .filter((x) => x.score >= 3)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/** Pairs of memories that look like duplicates of each other (for Memory Health). */
export function findDuplicatePairs(memories, threshold = 0.5) {
  const list = memories.filter((m) => m.status !== 'archived').slice(0, 400);
  const kws = list.map(coreKeywords);
  const pairs = [];
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const s = jaccard(kws[i], kws[j]);
      if (s >= threshold) pairs.push({ a: list[i], b: list[j], score: s });
    }
  }
  return pairs.sort((x, y) => y.score - x.score);
}
