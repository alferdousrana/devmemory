/**
 * AI-ready service interface.
 *
 * MVP: every method runs locally (no network, no API keys). Later, register a
 * remote provider that calls YOUR backend (e.g. a Firebase Cloud Function that
 * holds the OpenAI/Anthropic key server-side and checks the user's ID token):
 *
 *   setAIProvider(createRemoteProvider({ endpoint: '/api/ai', getIdToken }))
 *
 * NEVER put model API keys in this frontend — anything shipped to GitHub
 * Pages is public.
 */
import { parseCapture } from '../localParser.js';
import { relatedMemories } from '../duplicateService.js';

const KNOWN_ERRORS = [
  [/econnrefused|connection refused/i, 'Nothing is listening at that host/port. Check the service is running, the port is right, and — in Docker — that you use the service name (e.g. "db"), not localhost.'],
  [/cors|access-control-allow-origin/i, 'The browser blocked a cross-origin request. The API server must allow your frontend origin (e.g. CORS_ALLOWED_ORIGINS in Django, the cors middleware in Express).'],
  [/modulenotfounderror|no module named|cannot find module/i, 'A dependency is not installed in the active environment. Check the virtualenv/node_modules you are running from, then install the package.'],
  [/permission denied|eacces/i, 'The process lacks rights to that file, port or socket. Check ownership/permissions; ports below 1024 need elevated privileges.'],
  [/address already in use|eaddrinuse|port .* in use/i, 'Another process holds that port. Find it (lsof -i :PORT / netstat) and stop it, or use another port.'],
  [/csrf/i, 'The request is missing a valid CSRF token or the origin is not trusted (CSRF_TRUSTED_ORIGINS in Django).'],
  [/merge conflict|conflict \(content\)/i, 'Both branches changed the same lines. Edit the files to resolve the markers, git add them, then continue the merge/rebase.'],
  [/detached head/i, 'You checked out a commit, not a branch. Create a branch (git switch -c name) to keep any work.'],
  [/relation .* does not exist|no such table/i, 'The table is missing — migrations have not been applied to this database.'],
  [/401|unauthori[sz]ed/i, 'The request has no valid credentials. Check the token/header and that it has not expired.'],
  [/404|not found/i, 'The path or resource does not exist. Check the URL, route registration and base path.'],
];

export const localProvider = {
  name: 'local',
  async generateTitle(text) { return parseCapture(text).title; },
  async extractTags(text) { return parseCapture(text).tags; },
  async summarizeMemory(memory) {
    const source = memory.solution || memory.problem || memory.content || '';
    const first = String(source).split(/(?<=[.!?])\s+/)[0] || '';
    return first.length > 200 ? `${first.slice(0, 197)}…` : first;
  },
  async explainError(errorMessage) {
    const hit = KNOWN_ERRORS.find(([re]) => re.test(errorMessage || ''));
    return hit ? hit[1] : null;
  },
  async findRelatedMemories(memory, memories, limit = 5) { return relatedMemories(memory, memories, limit); },
  async createFlashcards(memory) {
    const cards = [];
    if (memory.solution) cards.push({ q: `How did you fix: ${memory.title}?`, a: memory.solution });
    if (memory.rootCause) cards.push({ q: `What caused: ${memory.title}?`, a: memory.rootCause });
    if (memory.commands?.length) cards.push({ q: `Which command(s) fix: ${memory.title}?`, a: memory.commands.join('\n') });
    if (!cards.length && memory.content) cards.push({ q: `What do you know about: ${memory.title}?`, a: memory.content });
    return cards;
  },
};

/** Example remote provider — calls your secure backend; falls back to local on error. */
export function createRemoteProvider({ endpoint, getIdToken }) {
  const call = async (task, payload) => {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await getIdToken()}` },
      body: JSON.stringify({ task, payload }),
    });
    if (!res.ok) throw new Error(`AI backend ${res.status}`);
    return (await res.json()).result;
  };
  const withFallback = (task, localFn) => async (...args) => { try { return await call(task, args); } catch { return localFn(...args); } };
  return Object.fromEntries(Object.entries(localProvider).map(([k, fn]) => [k, k === 'name' ? 'remote' : withFallback(k, fn)]));
}

let provider = localProvider;
export function setAIProvider(p) { provider = p; }

export const aiService = {
  generateTitle: (...a) => provider.generateTitle(...a),
  extractTags: (...a) => provider.extractTags(...a),
  summarizeMemory: (...a) => provider.summarizeMemory(...a),
  explainError: (...a) => provider.explainError(...a),
  findRelatedMemories: (...a) => provider.findRelatedMemories(...a),
  createFlashcards: (...a) => provider.createFlashcards(...a),
  get providerName() { return provider.name; },
};
