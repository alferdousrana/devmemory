/**
 * Local Quick Capture parser — turns a free-text note into a structured memory.
 * Pure function, no network, no AI API. aiService can later swap in a model
 * behind a secure backend while keeping this as the offline fallback.
 *
 * "Django CORS error because frontend origin wasn't allowed. Installed
 *  django-cors-headers and added CORS_ALLOWED_ORIGINS."
 *   → title "Django CORS Error", problem "Frontend origin was not allowed.",
 *     solution "Installed django-cors-headers and added CORS_ALLOWED_ORIGINS.",
 *     tags [django, cors, debugging], type BUG
 */

// [display, tag, aliases, memoryTypeHint, language, isFramework]
export const TECHNOLOGIES = [
  ['Django', 'django', ['django'], null, 'python', true],
  ['Flask', 'flask', ['flask'], null, 'python', true],
  ['FastAPI', 'fastapi', ['fastapi'], 'API', 'python', true],
  ['Python', 'python', ['python', 'python3', 'pip', 'pip3', 'venv', 'pytest', 'virtualenv'], null, 'python', false],
  ['PostgreSQL', 'postgresql', ['postgresql', 'postgres', 'psql'], 'DATABASE', 'sql', false],
  ['MySQL', 'mysql', ['mysql'], 'DATABASE', 'sql', false],
  ['SQLite', 'sqlite', ['sqlite', 'sqlite3'], 'DATABASE', 'sql', false],
  ['MongoDB', 'mongodb', ['mongodb', 'mongo', 'mongoose'], 'DATABASE', 'javascript', false],
  ['Redis', 'redis', ['redis'], 'DATABASE', null, false],
  ['Docker', 'docker', ['docker', 'dockerfile', 'docker-compose', 'container', 'containers'], 'DOCKER', null, false],
  ['Kubernetes', 'kubernetes', ['kubernetes', 'k8s', 'kubectl', 'helm'], 'DOCKER', null, false],
  ['Git', 'git', ['git', 'github', 'gitlab', 'rebase'], 'GIT', null, false],
  ['Linux', 'linux', ['linux', 'ubuntu', 'debian', 'chmod', 'chown', 'systemd', 'systemctl', 'apt', 'apt-get'], 'LINUX', 'bash', false],
  ['Bash', 'bash', ['bash', 'zsh', 'shell script'], 'LINUX', 'bash', false],
  ['React', 'react', ['react', 'jsx', 'useeffect', 'usestate', 'next.js', 'nextjs'], null, 'javascript', true],
  ['Vue', 'vue', ['vue', 'vuejs', 'nuxt'], null, 'javascript', true],
  ['Node.js', 'node', ['node', 'nodejs', 'node.js', 'express'], null, 'javascript', false],
  ['npm', 'npm', ['npm', 'yarn', 'pnpm', 'npx'], null, 'javascript', false],
  ['TypeScript', 'typescript', ['typescript', 'tsc', 'tsconfig'], null, 'typescript', false],
  ['JavaScript', 'javascript', ['javascript', 'js', 'es6'], null, 'javascript', false],
  ['Vite', 'vite', ['vite'], null, 'javascript', false],
  ['Nginx', 'nginx', ['nginx'], null, null, false],
  ['Gunicorn', 'gunicorn', ['gunicorn', 'uwsgi'], null, 'python', false],
  ['AWS', 'aws', ['aws', 'ec2', 's3', 'lambda', 'iam', 'rds', 'cloudfront', 'route53'], null, null, false],
  ['Firebase', 'firebase', ['firebase', 'firestore'], null, 'javascript', false],
  ['CORS', 'cors', ['cors'], null, null, false],
  ['JWT', 'jwt', ['jwt'], null, null, false],
  ['OAuth', 'oauth', ['oauth', 'oauth2'], null, null, false],
  ['SSH', 'ssh', ['ssh', 'scp'], 'LINUX', null, false],
  ['GraphQL', 'graphql', ['graphql'], 'API', null, false],
  ['REST API', 'api', ['api', 'rest', 'endpoint', 'endpoints'], 'API', null, false],
  ['CSS', 'css', ['css', 'flexbox', 'tailwind', 'scss'], null, 'css', false],
  ['HTML', 'html', ['html'], null, 'html', false],
  ['Celery', 'celery', ['celery'], null, 'python', false],
  ['Webpack', 'webpack', ['webpack'], null, 'javascript', false],
];

const TOPICS = [
  ['networking', /\b(connection refused|econnrefused|timed? ?out|port \d+|dns|socket|host unreachable|network)\b/i],
  ['auth', /\b(auth|authentication|login|logged in|token|session|csrf|oauth|jwt|unauthori[sz]ed|401)\b/i],
  ['database', /\b(database|migration|migrations|query|schema|index|transaction|orm)\b/i],
  ['performance', /\b(slow|performance|latency|memory leak|n\+1|optimi[sz]e)\b/i],
  ['testing', /\b(test|tests|pytest|jest|vitest|unit test)\b/i],
  ['deployment', /\b(deploy|deployment|production|ci\/cd|pipeline|release)\b/i],
  ['permissions', /\b(permission denied|eacces|chmod|forbidden|403)\b/i],
  ['dependencies', /\b(dependency|dependencies|version conflict|peer dep|lockfile|requirements\.txt|package\.json)\b/i],
];

const ERROR_RE = /(\b[A-Za-z]+(?:Error|Exception)\b|\b(?:error|errors|exception|failed|failure|fails|failing|refused|denied|not found|cannot|can't|couldn't|unable|undefined|traceback|timeout|timed out|crash|crashed|crashes|broken|bug|econnrefused|segfault|panic|500|404|403|401|doesn't work|does not work|not working)\b)/i;
const CAUSE_RE = /\s*\b(because|due to|caused by|as the|root cause (?:was|is)|the reason (?:was|is)|turns out|turned out)\b\s*/i;
const SOLUTION_START_RE = /^(?:so\s+|then\s+|finally\s+|i\s+)?(fix(?:ed)?|solved|solution|resolved|workaround|install(?:ed)?|add(?:ed)?|ran|run|set|changed|updated|configured|upgraded|downgraded|removed|deleted|restarted|switched|replaced|enabled|disabled|created|moved|renamed|used|reinstalled|cleared|pinned|exported|wrapped|increased|decreased|allowed|whitelisted)\b/i;
const INLINE_SOLUTION_RE = /^(.*?)[,;]?\s*\b(?:fixed|solved|resolved)(?: it| this)? (?:by|with)\s+(.+)$/i;
const SOLUTION_LABEL_RE = /^(?:fix|solution|resolution|answer)\s*[:\-]\s*(.+)$/i;
const CLI = '(?:sudo\\s+)?(?:pip3?|npm|npx|yarn|pnpm|docker(?:-compose)?|git|python3?|kubectl|psql|brew|apt(?:-get)?|chmod|chown|ssh|scp|curl|systemctl|aws|firebase|make|cargo|go|node|poetry|alembic|gunicorn|uvicorn|redis-cli|mysql|createdb|dropdb|pg_dump)';
const LEAD = ['ran', 'run', 'running', 'execute', 'executed', 'type', 'typed', 'use', 'used', 'using', 'via', 'try', 'tried', 'with', 'then']
  .map((w) => `[${w[0]}${w[0].toUpperCase()}]${w.slice(1)}`).join('|');
// Case-sensitive on purpose: "Docker Postgres…" (prose) is not a command, "docker compose up" is.
const CLI_RE = new RegExp(`(?:^|\\$\\s*|\\b(?:${LEAD})\\s+|:\\s+)(${CLI}\\s+[^\\s,;]+(?:\\s+(?!and\\b|then\\b|to\\b|because\\b|which\\b|so\\b|but\\b|in\\b)[^\\s,;]+){0,7})`, 'gm');

const ACRONYMS = {
  api: 'API', cors: 'CORS', sql: 'SQL', jwt: 'JWT', ssh: 'SSH', aws: 'AWS', url: 'URL', http: 'HTTP', https: 'HTTPS',
  css: 'CSS', html: 'HTML', json: 'JSON', yaml: 'YAML', npm: 'npm', ci: 'CI', cd: 'CD', orm: 'ORM', db: 'DB',
  dns: 'DNS', tls: 'TLS', ssl: 'SSL', cli: 'CLI', ui: 'UI', id: 'ID', csrf: 'CSRF', ec2: 'EC2', s3: 'S3', iam: 'IAM',
  rds: 'RDS', env: 'env', os: 'OS', io: 'IO', vm: 'VM', ip: 'IP', tcp: 'TCP', udp: 'UDP', gpu: 'GPU', cpu: 'CPU', oauth: 'OAuth',
};
const SMALL = new Set(['a', 'an', 'the', 'of', 'in', 'on', 'to', 'for', 'with', 'and', 'or', 'vs', 'via', 'at', 'by', 'from']);
const CONTRACTIONS = [
  [/\bwasn['’]t\b/gi, 'was not'], [/\bweren['’]t\b/gi, 'were not'], [/\bisn['’]t\b/gi, 'is not'],
  [/\baren['’]t\b/gi, 'are not'], [/\bdidn['’]t\b/gi, 'did not'], [/\bdoesn['’]t\b/gi, 'does not'],
  [/\bdon['’]t\b/gi, 'do not'], [/\bcan['’]t\b/gi, 'cannot'], [/\bcouldn['’]t\b/gi, 'could not'],
  [/\bwouldn['’]t\b/gi, 'would not'], [/\bwon['’]t\b/gi, 'will not'], [/\bhasn['’]t\b/gi, 'has not'],
  [/\bhaven['’]t\b/gi, 'have not'], [/\bshouldn['’]t\b/gi, 'should not'],
];

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const aliasRes = TECHNOLOGIES.map(([display, tag, aliases, typeHint, lang, isFw]) => ({
  display, tag, typeHint, lang, isFw,
  re: new RegExp(`(^|[^a-z0-9_])(${aliases.map(escapeRe).join('|')})(?=$|[^a-z0-9_])`, 'i'),
  aliases,
}));

export function detectTechnologies(text) {
  const found = [];
  for (const t of aliasRes) {
    const m = t.re.exec(text);
    if (m) found.push({ ...t, index: m.index + m[1].length });
  }
  // JavaScript is implied by React/Node etc.; drop generic "js" duplicates only when explicitly absent
  return found.sort((a, b) => a.index - b.index);
}

function expandContractions(s) {
  return CONTRACTIONS.reduce((acc, [re, rep]) => acc.replace(re, rep), s);
}

export function cleanSentence(s, { expand = true } = {}) {
  let t = String(s || '').trim().replace(/^[\s,;:\-–—]+|[\s,;:\-–—.!?]+$/g, '');
  if (!t) return '';
  if (expand) t = expandContractions(t);
  return `${t.charAt(0).toUpperCase()}${t.slice(1)}.`;
}

function techDisplayFor(word) {
  const w = word.toLowerCase();
  for (const t of aliasRes) {
    if (t.aliases.includes(w) && !/[-.]/.test(w)) return t.aliases[0] === w || t.tag === w ? t.display : null;
  }
  return null;
}

export function titleCase(text) {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((word, i) => {
      if (/[-_./]/.test(word.replace(/[.,:;]$/, '')) || /[A-Z].*[A-Z]/.test(word.slice(1)) || /\d/.test(word)) return word;
      const lower = word.toLowerCase();
      if (ACRONYMS[lower]) return ACRONYMS[lower];
      const tech = techDisplayFor(lower);
      if (tech) return tech;
      if (i > 0 && SMALL.has(lower)) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ');
}

const ERROR_PHRASES = [
  'connection refused', 'permission denied', 'module not found', 'no such file or directory', 'address already in use',
  'port already in use', 'timed out', 'out of memory', 'syntax error', 'merge conflict', 'cors error', 'not found',
  'internal server error', 'unauthorized', 'forbidden', 'import error', 'migration error', 'build failed', 'detached head',
  'segmentation fault', 'certificate', 'too many connections', 'deadlock', 'memory leak', 'infinite loop', 'race condition',
];

function findErrorPhrase(text) {
  const lower = text.toLowerCase();
  const named = text.match(/\b([A-Z][a-zA-Z]+(?:Error|Exception))\b/);
  if (named) return named[1];
  return ERROR_PHRASES.find((p) => lower.includes(p)) || null;
}

function stripLeadIn(s) {
  return s
    .replace(/^(?:today\s+)?(?:i\s+)?(?:got|getting|was getting|had|have|kept getting|saw|seeing|hit|ran into|encountered)\s+(?:an?\s+|the\s+)?/i, '')
    .replace(/^(?:there\s+(?:was|is)\s+)(?:an?\s+|the\s+)?/i, '')
    .replace(/^(?:an?|the)\s+/i, '');
}

export function extractCommands(text, techs = []) {
  const commands = new Set();
  for (const m of text.matchAll(/`([^`\n]{2,300})`/g)) {
    if (/\s/.test(m[1]) || /^[a-z][\w-]*$/.test(m[1]) === false) commands.add(m[1].trim());
  }
  for (const line of text.split('\n')) {
    const m = line.match(/^\s*[$>]\s+(.+)$/);
    if (m) commands.add(m[1].trim());
  }
  for (const m of text.matchAll(CLI_RE)) commands.add(m[1].trim().replace(/[.]+$/, ''));
  // "installed django-cors-headers" in a Python context → pip install django-cors-headers
  const isPy = techs.some((t) => t.lang === 'python');
  const isJs = techs.some((t) => t.lang === 'javascript' || t.lang === 'typescript');
  for (const m of text.matchAll(/\binstall(?:ed|ing)?\s+([a-z0-9@][\w@/.-]*[\w])/gi)) {
    const pkg = m[1];
    if (/^(it|the|a|an|this|that|them|again|pip|npm|yarn|docker|from)$/i.test(pkg)) continue;
    if ([...commands].some((c) => c.includes(pkg))) continue;
    if (isPy && !isJs) commands.add(`pip install ${pkg}`);
    else if (isJs && !isPy) commands.add(`npm install ${pkg}`);
  }
  return [...commands].slice(0, 10);
}

function extractErrorMessage(text) {
  const named = text.match(/\b([A-Z][A-Za-z]*(?:Error|Exception):[^\n]*?)(?=\.\s|\.$|\n|$)/);
  if (named) return named[1].trim().slice(0, 500);
  const line = text.split('\n').find((l) => /^\s*([A-Za-z_.]*(?:Error|Exception)\b[:(].*|E[A-Z]{3,}:.*|fatal:.*|error:.*)$/i.test(l));
  if (line) return line.trim().slice(0, 500);
  const quoted = text.match(/["“]([^"”\n]{6,300})["”]/);
  if (quoted && ERROR_RE.test(quoted[1])) return quoted[1];
  return '';
}

function extractStackTrace(text) {
  const lines = text.split('\n');
  const start = lines.findIndex((l) => /Traceback \(most recent call last\)|^\s+at\s+\S+\s+\(|^\s+File ".+", line \d+/.test(l));
  if (start === -1) return '';
  const block = [];
  for (let i = start; i < lines.length && block.length < 60; i++) {
    if (!lines[i].trim() && block.length > 2) break;
    block.push(lines[i]);
  }
  return block.join('\n');
}

function looksLikeCode(text) {
  const lines = text.split('\n').filter((l) => l.trim());
  if (lines.length < 2) return false;
  const codeish = lines.filter((l) => /(^\s{2,}\S|[{};]\s*$|^\s*(def|class|function|const|let|import|from|return|if|for|SELECT|FROM|WHERE)\b|=>|\(\)\s*{)/.test(l)).length;
  return codeish / lines.length > 0.5;
}

function detectType(text, techs, { isCode, hasSolution }) {
  const firstLine = text.trim().split('\n')[0];
  if (isCode && !ERROR_RE.test(firstLine)) return 'SNIPPET';
  if (ERROR_RE.test(text)) return 'BUG';
  if (/^\s*\$\s/.test(text) || (new RegExp(`^\\s*${CLI}\\s`).test(text) && text.length < 200 && !text.includes('. '))) return 'COMMAND';
  if (/^\s*https?:\/\/\S+\s*$/.test(text)) return 'BOOKMARK';
  if (/\b(architecture|design decision|decided to|trade-?offs?|adr)\b/i.test(text)) return 'ARCHITECTURE';
  if (/\b(difference between|is a|are a|means|definition|concept)\b/i.test(text)) return 'CONCEPT';
  if (/\b(learned|til|today i learned|learnt|realized|realised)\b/i.test(text)) return 'LEARNING';
  if (hasSolution) return 'SOLUTION';
  const hint = techs.find((t) => t.typeHint)?.typeHint;
  if (hint) return hint;
  if (/\b(port|dns|tcp|udp|socket|firewall|ip address)\b/i.test(text)) return 'NETWORKING';
  return 'OTHER';
}

export function parseCapture(input) {
  const text = String(input || '').trim();
  const empty = {
    type: 'OTHER', title: '', content: text, problem: '', rootCause: '', solution: '', errorMessage: '',
    stackTrace: '', commands: [], tags: [], language: '', framework: '', technologies: [], sourceUrl: '',
  };
  if (!text) return empty;

  const techs = detectTechnologies(text);
  const isCode = looksLikeCode(text);
  const stackTrace = extractStackTrace(text);
  const prose = stackTrace ? text.replace(stackTrace, ' ') : text;
  const sentences = prose.split(/(?<=[.!?])\s+(?=[A-Z0-9`$"“(])|\n+/).map((s) => s.trim()).filter(Boolean);

  let titleSeed = '';
  let rootCause = '';
  const problemParts = [];
  const solutionParts = [];

  for (const s of sentences) {
    const label = s.match(SOLUTION_LABEL_RE);
    if (label) { solutionParts.push(label[1]); continue; }
    const inline = s.match(INLINE_SOLUTION_RE);
    if (inline && inline[2].length > 3) {
      if (inline[1].trim()) { if (!titleSeed) titleSeed = inline[1]; else problemParts.push(inline[1]); }
      solutionParts.push(inline[2]);
      continue;
    }
    if (SOLUTION_START_RE.test(s) && (titleSeed || rootCause)) { solutionParts.push(s); continue; }
    const cause = s.split(CAUSE_RE);
    if (cause.length >= 3) {
      const before = cause[0].trim();
      const after = cause.slice(2).join(' ').trim();
      if (!titleSeed && before) titleSeed = before;
      else if (before) problemParts.push(before);
      if (!rootCause && after) rootCause = after;
      continue;
    }
    if (!titleSeed) titleSeed = s;
    else if (solutionParts.length) solutionParts.push(s);
    else problemParts.push(s);
  }

  // Title
  let seed = stripLeadIn(titleSeed.replace(/[.!?:]+$/, '').trim()).replace(/^(?:til|today i learned|learned that|learnt that)[:,]?\s+/i, '');
  const words = seed.split(/\s+/).filter(Boolean);
  const namedError = seed.match(/\b([A-Z][A-Za-z]*(?:Error|Exception))\b/);
  const mainTech = techs.find((t) => t.isFw) || techs[0];
  const commandsFound = isCode ? [] : extractCommands(text, techs);
  const looksCommand = /^\s*\$\s/.test(text) || (new RegExp(`^\\s*${CLI}\\s`).test(text) && text.length < 200 && !text.includes('. '));
  let title;
  if (looksCommand && commandsFound.length) {
    title = commandsFound[0];
  } else if (namedError) {
    title = `${mainTech && !seed.toLowerCase().startsWith(mainTech.display.toLowerCase()) ? `${mainTech.display} ` : ''}${namedError[1]}`;
  } else if (words.length && words.length <= 8 && !isCode) {
    title = titleCase(seed);
  } else {
    const phrase = findErrorPhrase(text);
    const main = mainTech;
    if (phrase && main) title = titleCase(`${main.display} ${phrase}`);
    else if (isCode) title = `${main ? `${main.display} ` : ''}snippet`;
    else title = titleCase(words.slice(0, 8).join(' '));
  }
  title = title.slice(0, 120);

  const hasSolution = solutionParts.length > 0;
  const type = detectType(text, techs, { isCode, hasSolution });

  const strip = (x) => x.replace(/[\s.!?]+$/, '');
  const problemText = rootCause
    ? cleanSentence(rootCause)
    : cleanSentence((problemParts.length ? problemParts : [titleSeed]).map(strip).filter(Boolean).join('. '));
  const solution = solutionParts.map((s) => cleanSentence(s, { expand: false })).join(' ');

  // Tags: technologies in order of appearance, then topics, then debugging
  const tags = [];
  const push = (t) => { if (t && !tags.includes(t)) tags.push(t); };
  techs.filter((t) => t.tag !== 'javascript' || techs.length === 1).forEach((t) => push(t.tag));
  for (const [tag, re] of TOPICS) if (re.test(text) && tags.length < 6) push(tag);
  if (type === 'BUG') push('debugging');

  const framework = techs.find((t) => t.isFw)?.display || '';
  const language = isCode ? guessCodeLanguage(text, techs) : (techs.find((t) => t.lang)?.lang || '');
  const url = text.match(/https?:\/\/[^\s)"'<>]+/)?.[0] || '';

  return {
    type,
    title,
    content: text,
    problem: ['SNIPPET', 'COMMAND', 'LEARNING', 'CONCEPT', 'BOOKMARK'].includes(type) ? '' : problemText,
    rootCause: rootCause ? cleanSentence(rootCause) : '',
    solution,
    errorMessage: extractErrorMessage(text),
    stackTrace,
    commands: commandsFound,
    tags: tags.slice(0, 8),
    language,
    framework,
    technologies: techs.map((t) => t.display),
    sourceUrl: url,
  };
}

export function guessCodeLanguage(code, techs = detectTechnologies(code)) {
  if (/^\s*(FROM|RUN|CMD|COPY|WORKDIR|EXPOSE|ENTRYPOINT)\s/m.test(code)) return 'dockerfile';
  if (/^\s*(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER)\s/im.test(code)) return 'sql';
  if (/{%\s*\w+|{{\s*\w+/.test(code)) return 'django';
  if (/^\s*(def |class \w+(\(|:)|import \w+|from \w+ import)/m.test(code)) return 'python';
  if (/:\s*(string|number|boolean|any)\b|interface \w+|<\w+>\(/.test(code)) return 'typescript';
  if (/\b(const|let|function|=>|console\.)/.test(code)) return 'javascript';
  if (/^\s*[{[]/.test(code) && /"\w+"\s*:/.test(code)) return 'json';
  if (/^\s*[\w-]+:\s/m.test(code) && !/[;{}]/.test(code)) return 'yaml';
  if (/^\s*(#!\/bin\/|sudo |apt |echo |export |cd )/m.test(code)) return 'bash';
  if (/<\/?[a-z][\s\S]*>/i.test(code)) return 'html';
  if (/[.#]?[\w-]+\s*{[^}]*:[^}]*}/.test(code)) return 'css';
  return techs.find((t) => t.lang)?.lang || 'plaintext';
}
