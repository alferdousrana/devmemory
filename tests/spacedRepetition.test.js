import { describe, it, expect } from 'vitest';
import { schedule, forget, dueQueue, isDue } from '../src/utils/spacedRepetition.js';
import { DAY } from '../src/utils/date.js';

const now = Date.UTC(2026, 9, 6, 12);

describe('spaced repetition', () => {
  it('first reviews: good = 1 day, easy = 3 days, again = 10 minutes', () => {
    expect(schedule({}, 'good', now).nextReviewAt).toBe(now + DAY);
    expect(schedule({}, 'easy', now).nextReviewAt).toBe(now + 3 * DAY);
    expect(schedule({}, 'again', now).nextReviewAt - now).toBe(10 * 60000);
  });
  it('intervals grow with good ratings and are capped', () => {
    let m = { lastReviewedAt: now - 10 * DAY, nextReviewAt: now, reviewCount: 3 };
    const s = schedule(m, 'good', now);
    expect(s.intervalDays).toBe(22);
    expect(s.reviewCount).toBe(4);
    expect(s.confidence).toBe(2);
    m = { lastReviewedAt: now - 170 * DAY, nextReviewAt: now };
    expect(schedule(m, 'easy', now).intervalDays).toBe(180);
  });
  it('hard grows slowly; again resets confidence', () => {
    const m = { lastReviewedAt: now - 10 * DAY, nextReviewAt: now };
    expect(schedule(m, 'hard', now).intervalDays).toBe(12);
    expect(schedule(m, 'again', now).confidence).toBe(0);
  });
  it('"I forgot this" makes it due immediately', () => {
    const f = forget(now);
    expect(isDue({ ...f, status: 'active' }, now)).toBe(true);
    expect(f.confidence).toBe(0);
  });
  it('builds a due queue, oldest first, excluding archived', () => {
    const q = dueQueue([
      { id: 'a', nextReviewAt: now - 1000 }, { id: 'b', nextReviewAt: now - 5000 },
      { id: 'c', nextReviewAt: now + 1000 }, { id: 'd', nextReviewAt: now - 9000, status: 'archived' },
    ], now);
    expect(q.map((x) => x.id)).toEqual(['b', 'a']);
  });
  it('rejects unknown ratings', () => { expect(() => schedule({}, 'meh', now)).toThrow(); });
});
