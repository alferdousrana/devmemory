import { describe, it, expect } from 'vitest';
import { createLocalProvider, parseQuery } from '../src/services/searchService.js';
import { buildDemoData } from '../src/data/demoData.js';

const data = { ...buildDemoData(), version: 1 };
const provider = createLocalProvider(() => data);

describe('local search', () => {
  it('parses filters', () => {
    expect(parseQuery('refused #docker type:bug in:snippets is:fav')).toEqual({
      text: 'refused', filters: { tags: ['docker'], types: ['BUG'], kinds: ['snippet'], favorites: true },
    });
  });
  it('finds memories via synonyms ("postgres container")', () => {
    const r = provider.search('postgres container');
    expect(r[0].title).toBe('Docker PostgreSQL connection refused');
  });
  it('tolerates typos', () => {
    expect(provider.search('dokcer compose').some((x) => x.kind === 'command')).toBe(true);
  });
  it('filters by tag and kind', () => {
    const r = provider.search('#git');
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((x) => x.tags.includes('git'))).toBe(true);
    expect(provider.search('in:commands').every((x) => x.kind === 'command')).toBe(true);
  });
});
