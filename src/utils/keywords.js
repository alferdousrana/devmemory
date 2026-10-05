/**
 * Search keyword normalisation.
 * "Django PostgreSQL connection refused" →
 *   [django, python, postgresql, postgres, database, sql, connection, refused, networking]
 */
export const STOPWORDS = new Set(`a an and are as at be because been but by can cant could did didnt do does doesnt
done for from had has have how i if in into is isnt it its just me my no not of on or our out so some that the
their them then there these they this to too up use used using was wasnt we were what when where which while who why
will with without would you your after before again also all any about added add got get gets set via than only very
wasn't isn't doesn't didn't can't won't couldn't`.split(/\s+/));

/** canonical term → related terms that should also match */
export const SYNONYMS = {
  postgresql: ['postgres', 'database', 'sql'],
  postgres: ['postgresql', 'database', 'sql'],
  psql: ['postgresql', 'postgres', 'database'],
  mysql: ['database', 'sql'],
  sqlite: ['database', 'sql'],
  mongodb: ['mongo', 'database', 'nosql'],
  mongo: ['mongodb', 'database'],
  redis: ['cache', 'database'],
  django: ['python'],
  flask: ['python'],
  fastapi: ['python', 'api'],
  pip: ['python'],
  venv: ['python'],
  react: ['javascript', 'frontend'],
  vue: ['javascript', 'frontend'],
  vite: ['javascript', 'frontend'],
  node: ['nodejs', 'javascript'],
  nodejs: ['node', 'javascript'],
  npm: ['node', 'javascript'],
  typescript: ['javascript', 'ts'],
  ts: ['typescript'],
  js: ['javascript'],
  py: ['python'],
  container: ['docker'],
  containers: ['docker'],
  compose: ['docker'],
  'docker-compose': ['docker', 'compose'],
  dockerfile: ['docker'],
  kubernetes: ['k8s', 'docker'],
  k8s: ['kubernetes'],
  refused: ['networking'],
  timeout: ['networking'],
  port: ['networking'],
  dns: ['networking'],
  cors: ['http', 'api'],
  jwt: ['auth', 'authentication'],
  oauth: ['auth', 'authentication'],
  auth: ['authentication'],
  login: ['auth'],
  ec2: ['aws'],
  s3: ['aws'],
  lambda: ['aws', 'serverless'],
  nginx: ['server', 'deployment'],
  rebase: ['git'],
  merge: ['git'],
  commit: ['git'],
  bash: ['shell', 'linux'],
  ssh: ['linux', 'networking'],
  chmod: ['linux', 'permissions'],
  migration: ['database'],
  migrations: ['database', 'migration'],
  query: ['database'],
  index: ['database'],
};

export function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[`'"“”‘’(){}[\]<>,;!?]/g, ' ')
    .split(/[\s/\\|:=+*&^%$@~]+/)
    .map((t) => t.replace(/^[.\-_#]+|[.\-_#]+$/g, ''))
    .filter((t) => t.length > 1 && t.length <= 40 && !STOPWORDS.has(t) && !/^\d+$/.test(t));
}

/** Build a deduplicated keyword list from any number of strings / string arrays. */
export function buildSearchKeywords(...parts) {
  const out = new Set();
  const add = (t) => { if (t && out.size < 200) out.add(t); };
  for (const part of parts.flat(Infinity)) {
    for (const token of tokenize(part)) {
      add(token);
      // split compound tokens: django-cors-headers → django, cors, headers
      if (/[-_.]/.test(token)) token.split(/[-_.]/).filter((x) => x.length > 1 && !STOPWORDS.has(x)).forEach(add);
      (SYNONYMS[token] || []).forEach(add);
    }
  }
  return [...out].slice(0, 200);
}

export function normalizeTag(tag) {
  return String(tag || '').trim().toLowerCase().replace(/^#+/, '').replace(/\s+/g, '-').replace(/[^a-z0-9+#.\-_]/g, '').slice(0, 50);
}
export function normalizeTags(tags) {
  const list = Array.isArray(tags) ? tags : String(tags || '').split(/[,\s]+/);
  return [...new Set(list.map(normalizeTag).filter(Boolean))].slice(0, 30);
}

export function jaccard(a, b) {
  const A = new Set(a); const B = new Set(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  return inter / (A.size + B.size - inter);
}
