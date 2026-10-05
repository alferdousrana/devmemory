import { describe, it, expect } from 'vitest';
import { buildSearchKeywords, normalizeTags, jaccard, tokenize } from '../src/utils/keywords.js';

describe('search keywords', () => {
  it('normalises and expands synonyms (spec example)', () => {
    const kw = buildSearchKeywords('Django PostgreSQL connection refused');
    for (const t of ['django', 'postgresql', 'postgres', 'database', 'connection', 'refused', 'python']) expect(kw).toContain(t);
  });
  it('splits compound package names', () => {
    expect(buildSearchKeywords('django-cors-headers')).toEqual(expect.arrayContaining(['django-cors-headers', 'django', 'cors', 'headers']));
  });
  it('drops stopwords and numbers', () => {
    expect(tokenize('the error was in 2024 because of it')).toEqual(['error']);
  });
  it('normalises tags', () => {
    expect(normalizeTags(['#Python', 'Docker Compose', 'python', ''])).toEqual(['python', 'docker-compose']);
  });
  it('computes jaccard similarity', () => {
    expect(jaccard(['a', 'b'], ['b', 'c'])).toBeCloseTo(1 / 3);
    expect(jaccard([], ['a'])).toBe(0);
  });
});
