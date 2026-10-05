import { describe, it, expect } from 'vitest';
import { buildDemoData } from '../src/data/demoData.js';
import { stats, memoryHealth, monthlySummary, devBrief, journeyEvents, mostUsedTechnology, insightSentences } from '../src/services/insightsService.js';

const now = Date.UTC(2026, 9, 20, 12);
const d = buildDemoData(now);

describe('insights over demo data', () => {
  it('computes dashboard stats', () => {
    const s = stats(d, now);
    expect(s).toMatchObject({ totalMemories: 10, snippets: 6, commands: 8, projects: 4, bookmarks: 5 });
    expect(s.reviewQueue).toBe(7);
    expect(s.errorsSolved).toBe(3);
  });
  it('computes memory health between 0 and 100 with suggestions', () => {
    const h = memoryHealth(d, now);
    expect(h.score).toBeGreaterThan(50);
    expect(h.score).toBeLessThanOrEqual(100);
    expect(h.suggestions.some((x) => x.href === '#/review')).toBe(true);
  });
  it('builds the dev brief', () => {
    const b = devBrief(d, {}, now);
    expect(b.toReview).toBe(7);
    expect(b.unresolvedBugs).toBe(1);
    expect(b.frequentCommands).toHaveLength(3);
  });
  it('builds the monthly summary and journey', () => {
    const m = monthlySummary(d, { searchTopicCounts: { docker: 12 } }, now);
    expect(m.mostSearched).toBe('Docker');
    expect(journeyEvents(d).length).toBeGreaterThan(10);
    expect(mostUsedTechnology(d)).not.toBeNull();
    expect(insightSentences(d, { searchTopicCounts: { docker: 12 } }, now)).toContain('You searched Docker 12 times.');
  });
  it('handles an empty account', () => {
    const empty = { memories: [], snippets: [], commands: [], projects: [], bookmarks: [], reviews: [], activity: [], collections: [] };
    expect(memoryHealth(empty).score).toBe(100);
    expect(stats(empty).totalMemories).toBe(0);
  });
});
