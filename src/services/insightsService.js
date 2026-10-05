/**
 * Developer insights, Memory Health, Dev Brief, monthly recap and the
 * Developer Journey — all computed locally from the cached data. Pure
 * functions: (data snapshot) → result, so they're easy to test.
 */
import { TECHNOLOGIES } from './localParser.js';
import { dueQueue } from '../utils/spacedRepetition.js';
import { findDuplicatePairs } from './duplicateService.js';
import { DAY, monthKey } from '../utils/date.js';

const TECH_TAGS = new Map(TECHNOLOGIES.map(([display, tag]) => [tag, display]));
const NON_TOPIC_TAGS = new Set(['debugging', 'cors', 'api', 'auth', 'networking', 'database', 'performance', 'testing', 'deployment', 'permissions', 'dependencies']);

export const techDisplay = (tag) => TECH_TAGS.get(tag) || tag;

function countTags(records, filter = () => true) {
  const counts = {};
  for (const r of records) for (const t of r.tags || []) if (filter(t)) counts[t] = (counts[t] || 0) + 1;
  return Object.entries(counts).sort((a, b) => b[1] - a[1]);
}

export function stats(d, now = Date.now()) {
  const bugs = d.memories.filter((m) => m.type === 'BUG');
  return {
    totalMemories: d.memories.length,
    errorsSolved: bugs.filter((b) => b.status === 'resolved').length,
    openErrors: bugs.filter((b) => b.status !== 'resolved').length,
    snippets: d.snippets.length,
    commands: d.commands.length,
    projects: d.projects.length,
    bookmarks: d.bookmarks.length,
    reviewQueue: dueQueue(d.memories, now).length,
  };
}

export function mostUsedTechnology(d) {
  const all = [...d.memories, ...d.snippets, ...d.commands];
  const top = countTags(all, (t) => TECH_TAGS.has(t) && !NON_TOPIC_TAGS.has(t))[0];
  return top ? { tag: top[0], name: techDisplay(top[0]), count: top[1] } : null;
}

export function mostActiveProject(d, since = 0) {
  const counts = {};
  for (const r of [...d.memories, ...d.snippets, ...d.commands, ...d.bookmarks]) {
    if (r.projectId && (r.updatedAt || r.createdAt || 0) >= since) counts[r.projectId] = (counts[r.projectId] || 0) + 1;
  }
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  if (!top) return null;
  const p = d.projects.find((x) => x.id === top[0]);
  return p ? { project: p, count: top[1] } : null;
}

export function mostSearchedTopic(searchTopicCounts = {}) {
  const top = Object.entries(searchTopicCounts).sort((a, b) => b[1] - a[1])[0];
  return top ? { topic: top[0], name: techDisplay(top[0]), count: top[1] } : null;
}

export function recentTopic(d, now = Date.now()) {
  const recent = d.memories.filter((m) => (m.createdAt || 0) > now - 14 * DAY);
  const top = countTags(recent.length ? recent : d.memories.slice(0, 15), (t) => t !== 'debugging')[0];
  return top ? techDisplay(top[0]) : null;
}

export function devBrief(d, { projectAttention = () => [] } = {}, now = Date.now()) {
  const projectsNeedingAttention = d.projects.filter((p) => projectAttention(p).length > 0);
  const frequentCommands = [...d.commands].filter((c) => c.copyCount > 0)
    .sort((a, b) => (b.copyCount || 0) - (a.copyCount || 0)).slice(0, 3);
  return {
    toReview: dueQueue(d.memories, now).length,
    unresolvedBugs: d.memories.filter((m) => m.type === 'BUG' && m.status !== 'resolved').length,
    projectsNeedingAttention,
    frequentCommands,
    recentTopic: recentTopic(d, now),
  };
}

/** Memory Health: 0–100 with actionable suggestions. */
export function memoryHealth(d, now = Date.now()) {
  const ms = d.memories.filter((m) => m.status !== 'archived');
  if (!ms.length) {
    return { score: 100, parts: [], suggestions: [{ text: 'Save your first memory to start tracking health.', href: '#/capture' }], duplicatePairs: [] };
  }
  const n = ms.length;
  const overdue = ms.filter((m) => m.nextReviewAt && m.nextReviewAt < now - DAY).length;
  const due = dueQueue(ms, now).length;
  const untagged = ms.filter((m) => !(m.tags || []).length).length;
  const incomplete = ms.filter(isIncomplete).length;
  const stale = ms.filter((m) => Math.max(m.updatedAt || 0, m.lastReviewedAt || 0) < now - 120 * DAY).length;
  const duplicatePairs = findDuplicatePairs(ms);
  const dupCount = Math.min(n, duplicatePairs.length);
  const parts = [
    { key: 'review', label: 'Review consistency', weight: 30, value: 1 - overdue / n },
    { key: 'tags', label: 'Tagged', weight: 20, value: 1 - untagged / n },
    { key: 'complete', label: 'Complete', weight: 20, value: 1 - incomplete / n },
    { key: 'duplicates', label: 'No duplicates', weight: 15, value: 1 - dupCount / n },
    { key: 'fresh', label: 'Fresh', weight: 15, value: 1 - stale / n },
  ];
  const score = Math.round(parts.reduce((s, p) => s + p.weight * Math.max(0, p.value), 0));
  const suggestions = [];
  if (due) suggestions.push({ text: `${due} memor${due === 1 ? 'y needs' : 'ies need'} review`, href: '#/review' });
  if (dupCount) suggestions.push({ text: `${dupCount} possible duplicate${dupCount === 1 ? '' : 's'}`, href: '#/insights#duplicates' });
  if (untagged) suggestions.push({ text: `${untagged} memor${untagged === 1 ? 'y has' : 'ies have'} no tags`, href: '#/memories?filter=untagged' });
  if (incomplete) suggestions.push({ text: `${incomplete} memor${incomplete === 1 ? 'y is' : 'ies are'} missing details`, href: '#/memories?filter=incomplete' });
  const undocumented = d.projects.filter((p) => p.status === 'active' && (!p.deployment || !(p.runCommand || p.backendCommand))).length;
  if (undocumented) suggestions.push({ text: `${undocumented} project${undocumented === 1 ? ' needs' : 's need'} updated documentation`, href: '#/projects' });
  if (stale) suggestions.push({ text: `${stale} memor${stale === 1 ? 'y hasn’t' : 'ies haven’t'} been touched in 4 months`, href: '#/memories?sort=oldest' });
  return { score, parts, suggestions, duplicatePairs };
}

export function isIncomplete(m) {
  return m.type === 'BUG'
    ? !String(m.problem || m.errorMessage || '').trim() || (m.status === 'resolved' && !String(m.solution || '').trim())
    : !String(m.content || m.solution || m.problem || '').trim();
}

/** "What I learned this month". */
export function monthlySummary(d, { searchTopicCounts = {} } = {}, ref = Date.now()) {
  const key = monthKey(ref);
  const inMonth = (r) => monthKey(r.createdAt || 0) === key;
  const memories = d.memories.filter(inMonth);
  const learnedTopics = countTags(memories.filter((m) => m.type !== 'BUG'), (t) => !['debugging'].includes(t))
    .slice(0, 6).map(([t]) => techDisplay(t));
  const techs = new Set(memories.flatMap((m) => (m.tags || []).filter((t) => TECH_TAGS.has(t) && !NON_TOPIC_TAGS.has(t))));
  const bugsSolved = d.memories.filter((m) => m.type === 'BUG' && m.status === 'resolved' && monthKey(m.updatedAt || m.createdAt || 0) === key).length;
  const monthStart = new Date(new Date(ref).getFullYear(), new Date(ref).getMonth(), 1).getTime();
  const topTech = countTags([...memories, ...d.snippets.filter(inMonth), ...d.commands.filter(inMonth)],
    (t) => TECH_TAGS.has(t) && !NON_TOPIC_TAGS.has(t))[0];
  return {
    memoriesSaved: memories.length,
    snippetsSaved: d.snippets.filter(inMonth).length,
    commandsSaved: d.commands.filter(inMonth).length,
    bugsSolved,
    learnedTopics,
    technologiesCount: techs.size,
    topTechnology: topTech ? techDisplay(topTech[0]) : null,
    mostActiveProject: mostActiveProject(d, monthStart)?.project?.name || null,
    mostSearched: mostSearchedTopic(searchTopicCounts)?.name || null,
    reviews: d.reviews.filter(inMonth).length,
  };
}

/** Human sentences for the Insights card. */
export function insightSentences(d, prefs = {}, now = Date.now()) {
  const out = [];
  const month = monthlySummary(d, prefs, now);
  if (month.memoriesSaved) out.push(`You saved ${month.memoriesSaved} memor${month.memoriesSaved === 1 ? 'y' : 'ies'} this month.`);
  if (month.bugsSolved) out.push(`You solved ${month.bugsSolved} bug${month.bugsSolved === 1 ? '' : 's'} this month.`);
  const tech = mostUsedTechnology(d);
  if (tech) out.push(`${tech.name} is your most active technology.`);
  const searched = mostSearchedTopic(prefs.searchTopicCounts);
  if (searched && searched.count > 1) out.push(`You searched ${searched.name} ${searched.count} times.`);
  const active = mostActiveProject(d, now - 30 * DAY);
  if (active) out.push(`${active.project.name} was your most active project.`);
  const unreviewed = d.memories.filter((m) => !m.reviewCount).length;
  if (unreviewed) out.push(`${unreviewed} memor${unreviewed === 1 ? 'y has' : 'ies have'} never been reviewed.`);
  return out;
}

/** Developer Journey timeline events, newest first. */
export function journeyEvents(d) {
  const events = [];
  for (const p of d.projects) {
    if (p.createdAt) events.push({ at: p.createdAt, kind: 'project', icon: 'folder', title: `Started ${p.name}`, href: `#/projects/${p.id}` });
    if (p.status === 'shipped' && p.updatedAt) events.push({ at: p.updatedAt, kind: 'deploy', icon: 'rocket', title: `Shipped ${p.name}`, href: `#/projects/${p.id}` });
  }
  for (const m of d.memories) {
    if (m.type === 'BUG' && m.status === 'resolved') events.push({ at: m.updatedAt || m.createdAt, kind: 'bug', icon: 'check', title: `Solved: ${m.title}`, href: `#/memories/${m.id}` });
  }
  // First time each technology appears = "learned"
  const firstSeen = new Map();
  for (const r of [...d.memories, ...d.snippets, ...d.commands]) {
    for (const t of r.tags || []) {
      if (!TECH_TAGS.has(t) || NON_TOPIC_TAGS.has(t)) continue;
      const at = r.createdAt || 0;
      if (!firstSeen.has(t) || at < firstSeen.get(t)) firstSeen.set(t, at);
    }
  }
  for (const [t, at] of firstSeen) if (at) events.push({ at, kind: 'learned', icon: 'spark', title: `First memory about ${techDisplay(t)}`, href: `#/search?q=%23${encodeURIComponent(t)}` });
  for (const s of d.snippets) if (s.createdAt) events.push({ at: s.createdAt, kind: 'snippet', icon: 'code', title: `Saved snippet: ${s.title}`, href: `#/snippets?open=${s.id}` });
  return events.filter((e) => e.at).sort((a, b) => b.at - a.at).slice(0, 300);
}
