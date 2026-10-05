/** Activity log (users/{uid}/activity) and the developer streak. */
import { getContext } from './context.js';
import { trackCommit } from './notify.js';
import { authState } from '../state/authState.js';
import { dataStore } from '../state/dataStore.js';
import { sanitize } from '../data/schema.js';
import { dayKey, DAY, startOfDay } from '../utils/date.js';
import { logError } from '../utils/errors.js';

/** Actions that keep the streak alive (per spec: save memory, review, snippet, command). */
const STREAK_TYPES = new Set(['memory_created', 'bug_created', 'review_completed', 'snippet_created', 'command_created']);

export const ACTIVITY_ICONS = {
  memory_created: 'brain', memory_updated: 'edit', bug_created: 'bug', bug_resolved: 'check',
  review_completed: 'repeat', snippet_created: 'code', command_created: 'terminal', project_created: 'folder',
  bookmark_created: 'bookmark', collection_created: 'layers', backup_imported: 'upload', backup_exported: 'download',
};

export function log(type, message, { refType = '', refId = '' } = {}) {
  const ctx = getContext();
  if (ctx.mode !== 'user') return;
  try {
    const rec = sanitize('activity', { type, message: String(message).slice(0, 300), refType, refId, userId: ctx.uid });
    trackCommit(ctx.repos.activity.create(ctx.uid, rec), 'activity');
  } catch (err) { logError(err, 'activity'); }
  if (STREAK_TYPES.has(type)) touchStreak();
}

export function touchStreak(now = Date.now()) {
  const ctx = getContext();
  const { profile } = authState.get();
  if (ctx.mode !== 'user' || !profile) return;
  const last = profile.lastActiveAt;
  if (last && dayKey(last) === dayKey(now)) return; // already counted today
  const continued = last && dayKey(last) === dayKey(now - DAY);
  const streak = continued ? (profile.streak || 0) + 1 : 1;
  const longestStreak = Math.max(streak, profile.longestStreak || 0);
  authState.set({ profile: { ...profile, streak, longestStreak, lastActiveAt: now } });
  try { trackCommit(ctx.repos.users.update(ctx.uid, { streak, longestStreak, lastActiveAt: now }), 'streak'); }
  catch (err) { logError(err, 'streak'); }
}

/** Streak as displayed: it lapses if the last active day was before yesterday. */
export function effectiveStreak(profile, now = Date.now()) {
  if (!profile?.lastActiveAt) return 0;
  const gap = startOfDay(now) - startOfDay(profile.lastActiveAt);
  return gap <= DAY * 1.1 ? profile.streak || 0 : 0;
}

export function recent(limit = 20) { return dataStore.get().activity.slice(0, limit); }
