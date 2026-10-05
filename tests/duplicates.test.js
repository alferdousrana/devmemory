import { describe, it, expect } from 'vitest';
import { findSimilarMemories, relatedMemories, findDuplicatePairs } from '../src/services/duplicateService.js';
import { buildSearchKeywords } from '../src/utils/keywords.js';

const mem = (id, title, extra = {}) => ({ id, title, problem: '', tags: [], status: 'active', ...extra, searchKeywords: buildSearchKeywords(title, extra.tags || []) });
const existing = [
  mem('1', 'PostgreSQL container connection problem', { tags: ['docker', 'postgresql'] }),
  mem('2', 'React useEffect runs twice', { tags: ['react'] }),
  mem('3', 'Git push rejected', { tags: ['git'] }),
];

describe('"I have seen this before"', () => {
  it('matches the spec example through synonyms', () => {
    const r = findSimilarMemories({ title: 'Docker Postgres connection refused', tags: ['docker'] }, existing);
    expect(r[0]?.memory.id).toBe('1');
    expect(r[0].similarity).toBeGreaterThan(30);
  });
  it('does not flag unrelated memories', () => {
    expect(findSimilarMemories({ title: 'CSS grid alignment in Safari' }, existing)).toEqual([]);
  });
  it('excludes the memory being edited', () => {
    expect(findSimilarMemories(existing[0], existing, { excludeId: '1' }).find((x) => x.memory.id === '1')).toBeUndefined();
  });
  it('finds related memories by tags and project', () => {
    const list = [...existing, mem('4', 'Docker volumes', { tags: ['docker'], projectId: 'p' }), mem('5', 'Docker networks', { tags: ['docker'], projectId: 'p' })];
    const r = relatedMemories(list[3], list);
    expect(r[0].memory.id).toBe('5');
    expect(r.map((x) => x.memory.id)).toContain('1');
  });
  it('finds duplicate pairs', () => {
    const pairs = findDuplicatePairs([mem('a', 'Docker Postgres connection refused'), mem('b', 'Postgres Docker connection refused'), mem('c', 'Unrelated CSS thing')]);
    expect(pairs).toHaveLength(1);
  });
});
