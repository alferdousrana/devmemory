/** Daily review — lightweight spaced repetition over memories. */
import { requireWritable } from './context.js';
import { trackCommit, toast } from './notify.js';
import { log } from './activityService.js';
import { memoryService } from './memoryService.js';
import { dataStore } from '../state/dataStore.js';
import { schedule, forget, dueQueue } from '../utils/spacedRepetition.js';
import { sanitize } from '../data/schema.js';
import { isToday } from '../utils/date.js';
import { track } from '../firebase/analytics.js';

export const reviewService = {
  queue(now = Date.now()) { return dueQueue(dataStore.get().memories, now); },

  /** The question shown on the card. */
  promptFor(memory) {
    if (memory.type === 'BUG' || memory.solution) return { q: 'What was the solution to:', subject: memory.title };
    if (memory.type === 'COMMAND') return { q: 'What does this do, and when do you use it?', subject: memory.title };
    return { q: 'What do you remember about:', subject: memory.title };
  },

  rate(memoryId, rating) {
    const { uid, repos } = requireWritable();
    const memory = memoryService.get(memoryId);
    if (!memory) return null;
    const next = schedule(memory, rating);
    memoryService.update(memoryId, {
      lastReviewedAt: next.lastReviewedAt, nextReviewAt: next.nextReviewAt,
      reviewCount: next.reviewCount, confidence: next.confidence,
    }, { silent: true });
    trackCommit(repos.reviews.create(uid, sanitize('reviews', {
      userId: uid, memoryId, rating, intervalDays: next.intervalDays, reviewedAt: next.lastReviewedAt,
    })), 'review');
    log('review_completed', `Reviewed ${memory.title}`, { refType: 'memory', refId: memoryId });
    track('review_completed');
    return next;
  },

  /** "I forgot this" — put it straight back at the front of the queue. */
  forgot(memoryId) {
    requireWritable();
    memoryService.update(memoryId, forget(), { silent: true });
    toast('Moved to the front of your review queue', { type: 'info' });
  },

  reviewedToday() { return dataStore.get().reviews.filter((r) => isToday(r.reviewedAt || r.createdAt)).length; },
};
