/**
 * Search across everything the user saved, using the locally cached data.
 *
 * Query syntax:  "connection refused #docker type:bug is:fav in:snippets"
 *
 * Architecture: callers use `searchService.search()`, which delegates to the
 * active provider. The default provider is local Fuse.js over the Firestore
 * cache. For large datasets, register a provider backed by Algolia, Typesense
 * or Meilisearch (synced via a Cloud Function) with `setSearchProvider()` —
 * no UI changes needed. We deliberately never run full-text Firestore scans.
 */
import Fuse from 'fuse.js';
import { dataStore } from '../state/dataStore.js';
import { TYPE_META, LANGUAGE_LABELS } from '../data/schema.js';
import { rememberSearch } from '../utils/prefs.js';
import { track } from '../firebase/analytics.js';
import { tokenize, SYNONYMS } from '../utils/keywords.js';

export const KIND_LABELS = { memory: 'Memories', snippet: 'Snippets', command: 'Commands', project: 'Projects', bookmark: 'Bookmarks', collection: 'Collections' };
const KIND_ALIASES = { memories: 'memory', memory: 'memory', errors: 'memory', bugs: 'memory', snippets: 'snippet', snippet: 'snippet', commands: 'command', command: 'command', projects: 'project', project: 'project', bookmarks: 'bookmark', bookmark: 'bookmark', collections: 'collection' };

export function buildIndexItems(d) {
  const items = [];
  for (const m of d.memories) items.push({
    kind: 'memory', id: m.id, title: m.title, type: m.type, subtitle: TYPE_META[m.type]?.label || 'Memory',
    text: [m.problem, m.errorMessage, m.solution, m.rootCause].filter(Boolean).join(' ').slice(0, 1500),
    tags: m.tags || [], keywords: m.searchKeywords || [], isFavorite: !!m.isFavorite, href: `#/memories/${m.id}`, updatedAt: m.updatedAt,
  });
  for (const s of d.snippets) items.push({
    kind: 'snippet', id: s.id, title: s.title, subtitle: LANGUAGE_LABELS[s.language] || s.language,
    text: `${s.description || ''} ${String(s.code || '').slice(0, 800)}`, tags: s.tags || [], keywords: s.searchKeywords || [],
    isFavorite: !!s.isFavorite, href: `#/snippets?open=${s.id}`, updatedAt: s.updatedAt,
  });
  for (const c of d.commands) items.push({
    kind: 'command', id: c.id, title: c.command, subtitle: c.category, text: `${c.description || ''} ${c.example || ''}`,
    tags: c.tags || [], keywords: c.searchKeywords || [], isFavorite: !!c.isFavorite, href: `#/commands?open=${c.id}`, updatedAt: c.updatedAt,
  });
  for (const p of d.projects) items.push({
    kind: 'project', id: p.id, title: p.name, subtitle: (p.techStack || []).join(', '), text: p.description || '',
    tags: p.tags || [], keywords: p.searchKeywords || [], isFavorite: !!p.isFavorite, href: `#/projects/${p.id}`, updatedAt: p.updatedAt,
  });
  for (const b of d.bookmarks) items.push({
    kind: 'bookmark', id: b.id, title: b.title, subtitle: b.url, text: `${b.description || ''} ${b.notes || ''}`,
    tags: b.tags || [], keywords: b.searchKeywords || [], isFavorite: !!b.isFavorite, href: `#/bookmarks?open=${b.id}`, url: b.url, updatedAt: b.updatedAt,
  });
  for (const c of d.collections) items.push({
    kind: 'collection', id: c.id, title: c.name, subtitle: `${(c.items || []).length} items`, text: c.description || '',
    tags: [], keywords: [], href: `#/collections/${c.id}`, updatedAt: c.updatedAt,
  });
  return items;
}

export function parseQuery(q) {
  const filters = { tags: [], kinds: [], types: [], favorites: false };
  const text = [];
  for (const tok of String(q || '').trim().split(/\s+/).filter(Boolean)) {
    const lower = tok.toLowerCase();
    if (lower.startsWith('#') && lower.length > 1) filters.tags.push(lower.slice(1));
    else if (lower.startsWith('type:')) filters.types.push(lower.slice(5).toUpperCase());
    else if (lower.startsWith('in:') && KIND_ALIASES[lower.slice(3)]) filters.kinds.push(KIND_ALIASES[lower.slice(3)]);
    else if (lower === 'is:fav' || lower === 'is:favorite') filters.favorites = true;
    else text.push(tok);
  }
  return { text: text.join(' '), filters };
}

const fuseOptions = {
  keys: [{ name: 'title', weight: 3 }, { name: 'tags', weight: 2 }, { name: 'keywords', weight: 1.5 }, { name: 'subtitle', weight: 0.5 }, { name: 'text', weight: 1 }],
  threshold: 0.3, ignoreLocation: true, includeScore: true, minMatchCharLength: 2,
};

/**
 * Multi-word queries: each token (plus its synonyms) is fuzzy-matched on its
 * own, then results are combined. An item must match most tokens; items that
 * also match the whole phrase rank higher. "postgres container" therefore
 * finds "Docker PostgreSQL connection refused".
 */
function rankTokens(fuse, text, tokenFuse = fuse) {
  const tokens = [...new Set(tokenize(text))].slice(0, 8);
  if (tokens.length <= 1) return fuse.search(text).map((r) => ({ item: r.item, score: r.score }));
  const per = tokens.map((tok) => {
    const best = new Map();
    for (const alt of [tok, ...(SYNONYMS[tok] || []).slice(0, 3)]) {
      for (const r of tokenFuse.search(alt)) {
        const sc = alt === tok ? r.score : r.score + 0.08;
        if (!best.has(r.item) || best.get(r.item) > sc) best.set(r.item, sc);
      }
    }
    return best;
  });
  const phrase = new Map(fuse.search(text).map((r) => [r.item, r.score]));
  const need = Math.max(1, Math.ceil(tokens.length * 0.75));
  const all = new Set(per.flatMap((m) => [...m.keys()]));
  const out = [];
  for (const item of all) {
    const scores = per.map((m) => m.get(item)).filter((x) => x != null);
    if (scores.length < need) continue;
    let score = scores.reduce((a, b) => a + b, 0) / scores.length + (tokens.length - scores.length) * 0.15;
    if (phrase.has(item)) score -= 0.1;
    out.push({ item, score });
  }
  return out.sort((a, b) => a.score - b.score);
}

export function createLocalProvider(getData = () => dataStore.get()) {
  let cache = { version: -1, items: [], fuse: null, tokenFuse: null };
  const ensure = () => {
    const d = getData();
    if (cache.version !== d.version || !cache.fuse) {
      const items = buildIndexItems(d);
      // Single words tolerate a bit more fuzz (typos like "dokcer") than whole phrases.
      cache = { version: d.version, items, fuse: new Fuse(items, fuseOptions), tokenFuse: new Fuse(items, { ...fuseOptions, threshold: 0.4 }) };
    }
    return cache;
  };
  return {
    name: 'local-fuse',
    search(query, { kinds = [], limit = 60 } = {}) {
      const { text, filters } = parseQuery(query);
      const { items, fuse, tokenFuse } = ensure();
      const allowKinds = new Set([...kinds, ...filters.kinds]);
      const pass = (it) =>
        (!allowKinds.size || allowKinds.has(it.kind))
        && (!filters.tags.length || filters.tags.every((t) => it.tags.includes(t)))
        && (!filters.types.length || filters.types.includes(it.type))
        && (!filters.favorites || it.isFavorite);
      let results;
      if (text.trim()) results = rankTokens(fuse, text, tokenFuse).filter((r) => pass(r.item)).map((r) => ({ ...r.item, score: r.score }));
      else results = items.filter(pass).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)).map((it) => ({ ...it, score: 0 }));
      return results.slice(0, limit);
    },
  };
}

let provider = createLocalProvider();

export function setSearchProvider(p) { provider = p; }

export const searchService = {
  search(query, opts) { return provider.search(query, opts); },
  /** Remember a search (locally) for "recent searches" and "most searched topic". */
  record(query, results = []) {
    const { text, filters } = parseQuery(query);
    const topics = [...filters.tags];
    const tagCounts = {};
    results.slice(0, 5).forEach((r) => (r.tags || []).forEach((t) => { if (t !== 'debugging') tagCounts[t] = (tagCounts[t] || 0) + 1; }));
    const topTag = Object.entries(tagCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
    if (topTag) topics.push(topTag);
    else if (text) topics.push(text.toLowerCase().split(/\s+/)[0]);
    rememberSearch(query, [...new Set(topics)]);
    track('search_used', { results: results.length });
  },
  grouped(results) {
    const groups = {};
    for (const r of results) (groups[r.kind] ||= []).push(r);
    return groups;
  },
};
