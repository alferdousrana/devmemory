/**
 * Lightweight spaced repetition (a simplified SM-2).
 *   again → see it again in 10 minutes, confidence resets
 *   hard  → interval grows slowly (×1.2, min 1 day)
 *   good  → interval ×2.2 (first time: 1 day)
 *   easy  → interval ×3.2 (first time: 3 days)
 * Intervals are capped at 180 days. Confidence is 0–3 (last rating).
 */
import { DAY } from './date.js';

export const RATING_CONFIDENCE = { again: 0, hard: 1, good: 2, easy: 3 };
const MAX_DAYS = 180;

export function currentIntervalDays(memory) {
  if (!memory?.lastReviewedAt || !memory?.nextReviewAt) return 0;
  return Math.max(0, (memory.nextReviewAt - memory.lastReviewedAt) / DAY);
}

export function schedule(memory, rating, now = Date.now()) {
  const prev = currentIntervalDays(memory);
  let days;
  switch (rating) {
    case 'again': days = 10 / (24 * 60); break;
    case 'hard': days = Math.max(1, prev * 1.2); break;
    case 'good': days = prev < 1 ? 1 : prev * 2.2; break;
    case 'easy': days = prev < 1 ? 3 : prev * 3.2; break;
    default: throw new Error(`Unknown rating: ${rating}`);
  }
  days = Math.min(MAX_DAYS, days);
  if (days >= 1) days = Math.round(days);
  return {
    lastReviewedAt: now,
    nextReviewAt: now + days * DAY,
    reviewCount: (memory?.reviewCount || 0) + 1,
    confidence: RATING_CONFIDENCE[rating],
    intervalDays: days,
  };
}

/** "I forgot this" — due right now, confidence reset, interval reset. */
export function forget(now = Date.now()) {
  return { nextReviewAt: now, lastReviewedAt: now, confidence: 0 };
}

export function isDue(memory, now = Date.now()) {
  return memory && memory.status !== 'archived' && memory.nextReviewAt != null && memory.nextReviewAt <= now;
}

export function dueQueue(memories, now = Date.now()) {
  return memories.filter((m) => isDue(m, now)).sort((a, b) => a.nextReviewAt - b.nextReviewAt);
}

export function describeInterval(days) {
  if (days < 1) return `${Math.round(days * 24 * 60)} min`;
  if (days < 30) return `${Math.round(days)} day${Math.round(days) === 1 ? '' : 's'}`;
  return `${Math.round(days / 30)} mo`;
}
