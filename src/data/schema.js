/**
 * DevMemory data schema — single source of truth for record shapes.
 *
 * Every write goes through `sanitize()` so documents only ever contain the
 * fields listed here. `firestore.rules` mirrors these field lists with
 * `keys().hasOnly([...])`; tests/schema-rules.test.js fails if they drift.
 */

export const MEMORY_TYPES = [
  'BUG', 'SOLUTION', 'CONCEPT', 'COMMAND', 'SNIPPET', 'API', 'DATABASE', 'DOCKER',
  'GIT', 'LINUX', 'NETWORKING', 'ARCHITECTURE', 'PROJECT', 'LEARNING', 'BOOKMARK', 'OTHER',
];

export const TYPE_META = {
  BUG: { label: 'Bug', hue: 4 },
  SOLUTION: { label: 'Solution', hue: 152 },
  CONCEPT: { label: 'Concept', hue: 262 },
  COMMAND: { label: 'Command', hue: 40 },
  SNIPPET: { label: 'Snippet', hue: 200 },
  API: { label: 'API', hue: 280 },
  DATABASE: { label: 'Database', hue: 210 },
  DOCKER: { label: 'Docker', hue: 205 },
  GIT: { label: 'Git', hue: 14 },
  LINUX: { label: 'Linux', hue: 48 },
  NETWORKING: { label: 'Networking', hue: 175 },
  ARCHITECTURE: { label: 'Architecture', hue: 240 },
  PROJECT: { label: 'Project', hue: 120 },
  LEARNING: { label: 'Learning', hue: 330 },
  BOOKMARK: { label: 'Bookmark', hue: 190 },
  OTHER: { label: 'Other', hue: 220 },
};

export const MEMORY_STATUSES = ['active', 'unresolved', 'investigating', 'resolved', 'archived'];
export const BUG_STATUSES = ['unresolved', 'investigating', 'resolved'];
export const PROJECT_STATUSES = ['active', 'paused', 'shipped', 'archived'];
export const BOOKMARK_CATEGORIES = ['documentation', 'github', 'stackoverflow', 'youtube', 'blog', 'tutorial', 'other'];
export const REVIEW_RATINGS = ['again', 'hard', 'good', 'easy'];
export const COMMAND_CATEGORIES = ['Git', 'Docker', 'Linux', 'Python', 'Django', 'PostgreSQL', 'npm', 'Node', 'AWS', 'SSH', 'Networking', 'Other'];
export const COMMAND_OS = ['any', 'linux', 'macos', 'windows'];
export const SNIPPET_LANGUAGES = [
  'python', 'javascript', 'typescript', 'html', 'css', 'sql', 'bash', 'json', 'django', 'dockerfile', 'yaml', 'markdown', 'plaintext',
];
export const LANGUAGE_LABELS = {
  python: 'Python', javascript: 'JavaScript', typescript: 'TypeScript', html: 'HTML', css: 'CSS', sql: 'SQL',
  bash: 'Bash', json: 'JSON', django: 'Django template', dockerfile: 'Dockerfile', yaml: 'YAML', markdown: 'Markdown', plaintext: 'Plain text',
};

const S = (max) => ({ kind: 'string', max });
const L = (max, item = 200) => ({ kind: 'list', max, item });
const B = { kind: 'bool' };
const N = { kind: 'number' };
const T = { kind: 'time' };
const E = (values) => ({ kind: 'enum', values });
const M = (max, keys) => ({ kind: 'maps', max, keys });

const ATTACHMENT_KEYS = ['path', 'url', 'name', 'size', 'contentType', 'width', 'height'];
const ITEM_KEYS = ['kind', 'id'];

export const SCHEMAS = {
  memories: {
    userId: S(128), type: E(MEMORY_TYPES), title: S(300), content: S(50000), problem: S(10000),
    errorMessage: S(10000), stackTrace: S(50000), environment: S(2000), rootCause: S(10000),
    solution: S(20000), commands: L(50, 2000), language: S(40), framework: S(60), projectId: S(128),
    tags: L(30, 50), sourceUrl: S(2000), isFavorite: B, isPrivate: B, status: E(MEMORY_STATUSES),
    createdAt: T, updatedAt: T, lastReviewedAt: T, nextReviewAt: T, reviewCount: N, confidence: N,
    searchKeywords: L(200, 60), attachments: M(10, ATTACHMENT_KEYS),
  },
  snippets: {
    userId: S(128), title: S(300), description: S(5000), code: S(100000), language: S(40),
    tags: L(30, 50), projectId: S(128), isFavorite: B, copyCount: N, lastUsedAt: T,
    searchKeywords: L(200, 60), createdAt: T, updatedAt: T,
  },
  commands: {
    userId: S(128), command: S(5000), description: S(5000), example: S(5000), os: E(COMMAND_OS),
    category: S(40), tags: L(30, 50), projectId: S(128), isFavorite: B, copyCount: N, lastUsedAt: T,
    searchKeywords: L(200, 60), createdAt: T, updatedAt: T,
  },
  projects: {
    userId: S(128), name: S(200), description: S(5000), repoUrl: S(2000), liveUrl: S(2000),
    techStack: L(30, 50), environment: S(10000), runCommand: S(1000), backendCommand: S(1000),
    frontendCommand: S(1000), importantCommands: L(50, 1000), architecture: S(20000),
    deployment: S(20000), database: S(5000), knownBugs: S(10000), status: E(PROJECT_STATUSES),
    isFavorite: B, tags: L(30, 50), searchKeywords: L(200, 60), createdAt: T, updatedAt: T,
  },
  bookmarks: {
    userId: S(128), title: S(300), url: S(2000), description: S(5000), tags: L(30, 50),
    category: E(BOOKMARK_CATEGORIES), notes: S(10000), projectId: S(128), isFavorite: B,
    searchKeywords: L(200, 60), createdAt: T, updatedAt: T,
  },
  collections: {
    userId: S(128), name: S(120), description: S(2000), icon: S(16), items: M(500, ITEM_KEYS),
    createdAt: T, updatedAt: T,
  },
  reviews: {
    userId: S(128), memoryId: S(128), rating: E(REVIEW_RATINGS), intervalDays: N, reviewedAt: T,
    createdAt: T, updatedAt: T,
  },
  activity: {
    userId: S(128), type: S(40), message: S(300), refType: S(40), refId: S(128), createdAt: T, updatedAt: T,
  },
  users: {
    uid: S(128), displayName: S(120), email: S(320), photoURL: S(2000), createdAt: T, updatedAt: T,
    onboardingCompleted: B, primaryTechnologies: L(40, 50), currentProjects: L(20, 120),
    theme: E(['dark', 'light', 'system']), timezone: S(80), streak: N, longestStreak: N, lastActiveAt: T,
  },
  settings: {
    reviewReminders: B, dailyReviewGoal: N, defaultMemoryType: E(MEMORY_TYPES), editorTabSize: N,
    createdAt: T, updatedAt: T,
  },
};

/** Fields that hold timestamps (stored as Firestore Timestamps, used in-app as epoch ms). */
export const TIME_FIELDS = new Set(
  Object.values(SCHEMAS).flatMap((s) => Object.entries(s).filter(([, f]) => f.kind === 'time').map(([k]) => k)),
);

/** Defaults applied when a record is first created. */
export const DEFAULTS = {
  memories: {
    type: 'OTHER', title: '', content: '', problem: '', errorMessage: '', stackTrace: '', environment: '',
    rootCause: '', solution: '', commands: [], language: '', framework: '', projectId: '', tags: [],
    sourceUrl: '', isFavorite: false, isPrivate: true, status: 'active', lastReviewedAt: null,
    nextReviewAt: null, reviewCount: 0, confidence: 0, searchKeywords: [], attachments: [],
  },
  snippets: { title: '', description: '', code: '', language: 'plaintext', tags: [], projectId: '', isFavorite: false, copyCount: 0, lastUsedAt: null, searchKeywords: [] },
  commands: { command: '', description: '', example: '', os: 'any', category: 'Other', tags: [], projectId: '', isFavorite: false, copyCount: 0, lastUsedAt: null, searchKeywords: [] },
  projects: {
    name: '', description: '', repoUrl: '', liveUrl: '', techStack: [], environment: '', runCommand: '',
    backendCommand: '', frontendCommand: '', importantCommands: [], architecture: '', deployment: '',
    database: '', knownBugs: '', status: 'active', isFavorite: false, tags: [], searchKeywords: [],
  },
  bookmarks: { title: '', url: '', description: '', tags: [], category: 'documentation', notes: '', projectId: '', isFavorite: false, searchKeywords: [] },
  collections: { name: '', description: '', icon: '📁', items: [] },
  reviews: {},
  activity: { refType: '', refId: '' },
  settings: { reviewReminders: true, dailyReviewGoal: 10, defaultMemoryType: 'BUG', editorTabSize: 2 },
};

function cleanString(v, max) {
  if (v == null) return '';
  const s = typeof v === 'string' ? v : String(v);
  return s.length > max ? s.slice(0, max) : s;
}

function cleanList(v, max, itemMax) {
  if (!Array.isArray(v)) return [];
  const out = [];
  const seen = new Set();
  for (const item of v) {
    if (typeof item !== 'string') continue;
    const s = item.trim().slice(0, itemMax);
    if (!s || seen.has(s)) continue;
    seen.add(s);
    out.push(s);
    if (out.length >= max) break;
  }
  return out;
}

function cleanMaps(v, max, keys) {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x) => x && typeof x === 'object' && !Array.isArray(x))
    .slice(0, max)
    .map((x) => {
      const o = {};
      for (const k of keys) {
        if (x[k] == null) continue;
        o[k] = typeof x[k] === 'number' ? x[k] : String(x[k]).slice(0, 2000);
      }
      return o;
    });
}

export function toMillis(v) {
  if (v == null || v === '') return null;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') { const t = Date.parse(v); return Number.isFinite(t) ? t : null; }
  if (v instanceof Date) return v.getTime();
  if (typeof v?.toMillis === 'function') return v.toMillis();
  if (typeof v?.seconds === 'number') return v.seconds * 1000;
  return null;
}

/**
 * Keep only known fields, coerce types and enforce size limits.
 * @param {string} collection key of SCHEMAS
 * @param {object} input
 * @param {{partial?: boolean}} opts partial=true for updates (only fields present in input)
 */
export function sanitize(collection, input, { partial = false } = {}) {
  const schema = SCHEMAS[collection];
  if (!schema) throw new Error(`Unknown collection: ${collection}`);
  const out = {};
  for (const [key, spec] of Object.entries(schema)) {
    if (!(key in input)) continue;
    const v = input[key];
    switch (spec.kind) {
      case 'string': out[key] = cleanString(v, spec.max); break;
      case 'list': out[key] = cleanList(v, spec.max, spec.item); break;
      case 'bool': out[key] = Boolean(v); break;
      case 'number': { const n = Number(v); out[key] = Number.isFinite(n) ? n : 0; break; }
      case 'time': out[key] = toMillis(v); break;
      case 'enum': if (spec.values.includes(v)) out[key] = v; break;
      case 'maps': out[key] = cleanMaps(v, spec.max, spec.keys); break;
      default: break;
    }
  }
  if (!partial) {
    for (const [k, v] of Object.entries(DEFAULTS[collection] || {})) {
      if (!(k in out)) out[k] = Array.isArray(v) ? [...v] : v;
    }
  }
  return out;
}

export const COLLECTION_NAMES = ['memories', 'snippets', 'commands', 'projects', 'bookmarks', 'collections', 'reviews', 'activity'];
