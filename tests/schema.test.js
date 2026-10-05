import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { sanitize, SCHEMAS } from '../src/data/schema.js';

describe('schema.sanitize', () => {
  it('drops unknown fields and applies defaults', () => {
    const m = sanitize('memories', { title: 'x', type: 'BUG', evil: '<script>', admin: true });
    expect(m.evil).toBeUndefined();
    expect(m.admin).toBeUndefined();
    expect(m.tags).toEqual([]);
    expect(m.status).toBe('active');
  });
  it('enforces enums, types and size limits', () => {
    const m = sanitize('memories', { title: 'a'.repeat(1000), type: 'NOPE', tags: ['x', 1, 'x', 'y'], reviewCount: 'abc', nextReviewAt: '2026-01-01T00:00:00Z' }, { partial: true });
    expect(m.title).toHaveLength(300);
    expect(m.type).toBeUndefined();
    expect(m.tags).toEqual(['x', 'y']);
    expect(m.reviewCount).toBe(0);
    expect(m.nextReviewAt).toBe(Date.parse('2026-01-01T00:00:00Z'));
  });
  it('partial mode only touches provided fields', () => {
    expect(Object.keys(sanitize('snippets', { title: 't' }, { partial: true }))).toEqual(['title']);
  });
});

/** Fails if firestore.rules field allow-lists drift from src/data/schema.js. */
describe('firestore.rules mirrors the schema', () => {
  const rules = readFileSync(resolve(process.cwd(), 'firestore.rules'), 'utf8');
  const fnFor = { users: 'validProfile', settings: 'validSettings', memories: 'validMemory', snippets: 'validSnippet', commands: 'validCommand', projects: 'validProject', bookmarks: 'validBookmark', collections: 'validCollection', reviews: 'validReview', activity: 'validActivity' };
  for (const [collection, fn] of Object.entries(fnFor)) {
    it(`${fn} allows exactly the ${collection} schema fields`, () => {
      const start = rules.indexOf(`function ${fn}(`);
      expect(start).toBeGreaterThan(-1);
      const m = rules.slice(start).match(/hasOnly\(\[([\s\S]*?)\]\)/);
      const fields = m[1].split(',').map((s) => s.trim().replace(/'/g, '')).filter(Boolean).sort();
      expect(fields).toEqual(Object.keys(SCHEMAS[collection]).sort());
    });
  }
});
