/**
 * Demo content — realistic examples so the product is never empty.
 * Used only in demo mode (in-memory, read-only, never written to Firestore).
 */
import { buildSearchKeywords } from '../utils/keywords.js';
import { DAY, startOfDay } from '../utils/date.js';

const H = 3600000;

export function buildDemoData(now = Date.now()) {
  const ago = (days, hours = 0) => now - days * DAY - hours * H;
  const P = { algo: 'demo-proj-algovision', portfolio: 'demo-proj-portfolio', drf: 'demo-proj-drf', learn: 'demo-proj-learning' };

  const projects = [
    {
      id: P.algo, name: 'AlgoVision AI', status: 'active', isFavorite: true,
      description: 'Visualises sorting and graph algorithms step by step, with an ML model that explains each step in plain language.',
      repoUrl: 'https://github.com/example/algovision-ai', liveUrl: '',
      techStack: ['Python', 'FastAPI', 'React', 'PostgreSQL', 'Redis', 'Celery', 'Docker'],
      runCommand: 'docker compose up', backendCommand: 'uvicorn app.main:app --reload', frontendCommand: 'npm run dev',
      importantCommands: ['docker compose exec api alembic upgrade head', 'celery -A app.worker worker -l info'],
      environment: 'API_URL=http://localhost:8000\nREDIS_URL=redis://redis:6379/0\nDATABASE_URL=postgresql://postgres:postgres@db:5432/algovision',
      architecture: 'React SPA → FastAPI (REST) → PostgreSQL.\nLong-running explanation jobs go through Celery workers with Redis as the broker; the UI polls /jobs/{id}.',
      deployment: '', database: 'PostgreSQL 16 (Docker volume pgdata). Alembic migrations.',
      knownBugs: 'Celery tasks occasionally stuck in PENDING after redeploy.', tags: ['python', 'fastapi', 'react'],
      createdAt: ago(58), updatedAt: ago(1, 3),
    },
    {
      id: P.portfolio, name: 'Developer Portfolio', status: 'shipped', isFavorite: false,
      description: 'Personal portfolio and blog. Static site with a small contact form backed by Firebase.',
      repoUrl: 'https://github.com/example/portfolio', liveUrl: 'https://example.dev',
      techStack: ['React', 'Vite', 'Firebase', 'AWS S3', 'CloudFront'],
      runCommand: '', backendCommand: '', frontendCommand: 'npm run dev', importantCommands: ['npm run build', 'aws s3 sync dist/ s3://example-portfolio --delete'],
      environment: 'VITE_FIREBASE_* values in .env.local', architecture: 'Static React build on S3 behind CloudFront. Contact form writes to Firestore.',
      deployment: '1. npm run build\n2. aws s3 sync dist/ s3://example-portfolio --delete\n3. aws cloudfront create-invalidation --distribution-id $DIST --paths "/*"',
      database: 'Firestore (contact messages only)', knownBugs: '', tags: ['react', 'aws'],
      createdAt: ago(120), updatedAt: ago(20),
    },
    {
      id: P.drf, name: 'Django REST API', status: 'active', isFavorite: true,
      description: 'Backend for a booking app: Django REST Framework, JWT auth, PostgreSQL, deployed with Docker + Nginx.',
      repoUrl: 'https://github.com/example/booking-api', liveUrl: 'https://api.example.dev',
      techStack: ['Django', 'Django REST Framework', 'PostgreSQL', 'Docker', 'Nginx', 'Gunicorn'],
      runCommand: 'docker compose up', backendCommand: 'python manage.py runserver', frontendCommand: '',
      importantCommands: ['docker compose exec web python manage.py migrate', 'docker compose exec web python manage.py createsuperuser', 'docker compose logs -f web'],
      environment: 'DJANGO_SETTINGS_MODULE=config.settings.dev\nDB_HOST=db\nDB_PORT=5432\nCORS_ALLOWED_ORIGINS=http://localhost:5173',
      architecture: 'Nginx → Gunicorn → Django/DRF. PostgreSQL in its own container. SimpleJWT for auth (access 5 min, refresh 7 days).',
      deployment: 'GitHub Actions builds the image, pushes to GHCR, then ssh deploy: docker compose pull && docker compose up -d && migrate.',
      database: 'PostgreSQL 16', knownBugs: '', tags: ['django', 'api'],
      createdAt: ago(40), updatedAt: ago(0, 5),
    },
    {
      id: P.learn, name: 'Learning Platform', status: 'active', isFavorite: false,
      description: 'Course platform for a university club: Django backend, React frontend, Redis cache, hosted on AWS.',
      repoUrl: 'https://github.com/example/learning-platform', liveUrl: '',
      techStack: ['Django', 'React', 'PostgreSQL', 'Redis', 'AWS'],
      runCommand: '', backendCommand: 'python manage.py runserver', frontendCommand: 'npm run dev',
      importantCommands: [], environment: '', architecture: 'Separate React SPA and Django API on different origins (needs CORS).',
      deployment: '', database: 'PostgreSQL on RDS', knownBugs: '', tags: ['django', 'react'],
      createdAt: ago(15), updatedAt: ago(70),
    },
  ];

  const mem = (o) => ({
    userId: 'demo', isPrivate: true, isFavorite: false, status: 'active', content: '', problem: '', errorMessage: '',
    stackTrace: '', environment: '', rootCause: '', solution: '', commands: [], language: '', framework: '', projectId: '',
    tags: [], sourceUrl: '', reviewCount: 0, confidence: 0, lastReviewedAt: null, attachments: [], ...o,
    searchKeywords: buildSearchKeywords(o.title, o.problem, o.errorMessage, o.rootCause, o.solution, o.tags, o.commands, o.content),
  });

  const memories = [
    mem({
      id: 'demo-mem-1', type: 'BUG', status: 'resolved', isFavorite: true, projectId: P.drf,
      title: 'Docker PostgreSQL connection refused',
      problem: 'Django container could not reach PostgreSQL after moving to docker compose.',
      errorMessage: 'psycopg2.OperationalError: connection to server at "localhost" (127.0.0.1), port 5432 failed: Connection refused',
      environment: 'docker compose, Django 5, postgres:16',
      rootCause: 'Inside a container, localhost is the container itself. The database runs in the "db" service.',
      solution: 'Set DB_HOST=db (the compose service name) and add depends_on with a healthcheck so web waits for Postgres.',
      commands: ['docker compose logs db', 'docker compose exec web env | grep DB_'],
      tags: ['docker', 'postgresql', 'networking', 'debugging'], language: 'python', framework: 'Django',
      createdAt: ago(21), updatedAt: ago(21), lastReviewedAt: ago(6), nextReviewAt: ago(0, 2), reviewCount: 3, confidence: 2,
    }),
    mem({
      id: 'demo-mem-2', type: 'BUG', status: 'resolved', projectId: P.learn,
      title: 'Django CORS Error',
      content: 'Django CORS error because frontend origin wasn\'t allowed. Installed django-cors-headers and added CORS_ALLOWED_ORIGINS.',
      problem: 'Frontend origin was not allowed.',
      errorMessage: "Access to fetch at 'http://localhost:8000/api/courses/' from origin 'http://localhost:5173' has been blocked by CORS policy",
      rootCause: 'Frontend origin was not allowed.',
      solution: 'Installed django-cors-headers, added it to INSTALLED_APPS and MIDDLEWARE (above CommonMiddleware), and set CORS_ALLOWED_ORIGINS.',
      commands: ['pip install django-cors-headers'], tags: ['django', 'cors', 'debugging'], language: 'python', framework: 'Django',
      sourceUrl: 'https://github.com/adamchainz/django-cors-headers',
      createdAt: ago(0, 6), updatedAt: ago(0, 6), nextReviewAt: ago(-1),
    }),
    mem({
      id: 'demo-mem-3', type: 'BUG', status: 'resolved', projectId: P.portfolio,
      title: 'React useEffect runs twice in development',
      problem: 'API was called twice on page load, but only in development.',
      rootCause: 'React StrictMode mounts, unmounts and re-mounts components in development to surface effects without cleanup.',
      solution: 'Kept StrictMode. Added an AbortController and cleanup function so the duplicate request is cancelled. Production only runs it once.',
      tags: ['react', 'javascript', 'debugging'], language: 'javascript', framework: 'React',
      createdAt: ago(33), updatedAt: ago(33), lastReviewedAt: ago(12), nextReviewAt: ago(1), reviewCount: 2, confidence: 1,
    }),
    mem({
      id: 'demo-mem-4', type: 'GIT', status: 'active',
      title: 'Git push rejected (non-fast-forward)',
      problem: 'git push was rejected because the remote had commits I did not have locally.',
      errorMessage: '! [rejected] main -> main (non-fast-forward)',
      solution: 'Rebase my local commits on top of the remote, then push. Never force-push a shared branch.',
      commands: ['git pull --rebase origin main', 'git push origin main'], tags: ['git'],
      createdAt: ago(45), updatedAt: ago(45), lastReviewedAt: ago(10), nextReviewAt: ago(0, 5), reviewCount: 4, confidence: 3,
    }),
    mem({
      id: 'demo-mem-5', type: 'BUG', status: 'investigating', projectId: P.algo,
      title: 'Celery tasks stuck in PENDING after redeploy',
      problem: 'After redeploying, new jobs stay PENDING forever. The worker logs show nothing.',
      environment: 'Celery 5.3, Redis 7, docker compose',
      rootCause: '', solution: '',
      content: 'Suspects: worker started before Redis was ready; task name changed after module rename; result backend not configured.',
      commands: ['celery -A app.worker inspect registered', 'docker compose logs -f worker'],
      tags: ['celery', 'redis', 'python', 'debugging'], language: 'python',
      createdAt: ago(2), updatedAt: ago(1, 3), nextReviewAt: ago(-1),
    }),
    mem({
      id: 'demo-mem-6', type: 'CONCEPT', isFavorite: true,
      title: 'PostgreSQL index types: B-tree vs GIN',
      content: 'B-tree (default) handles equality and range queries on scalar columns. GIN indexes "contain" queries — jsonb @>, arrays, and full-text search (tsvector). GIN is slower to update, faster to search many keys.',
      solution: 'Use B-tree for WHERE id = / created_at > queries. Use GIN for jsonb containment and full-text search.',
      commands: ['CREATE INDEX idx_events_payload ON events USING GIN (payload jsonb_path_ops);'],
      tags: ['postgresql', 'database'], language: 'sql', sourceUrl: 'https://www.postgresql.org/docs/current/indexes-types.html',
      createdAt: ago(18), updatedAt: ago(18), lastReviewedAt: ago(4), nextReviewAt: ago(0, 1), reviewCount: 2, confidence: 2,
    }),
    mem({
      id: 'demo-mem-7', type: 'LEARNING',
      title: 'JWT access vs refresh tokens',
      content: 'Access tokens are short-lived (minutes) and sent on every request. Refresh tokens live longer and are only sent to the refresh endpoint. Store the refresh token in an httpOnly, Secure, SameSite cookie, not localStorage.',
      solution: 'Short access token + httpOnly refresh cookie + rotate refresh tokens on use.',
      tags: ['jwt', 'auth', 'api'], projectId: P.drf,
      createdAt: ago(9), updatedAt: ago(9), lastReviewedAt: ago(3), nextReviewAt: ago(0, 3), reviewCount: 1, confidence: 1,
    }),
    mem({
      id: 'demo-mem-8', type: 'ARCHITECTURE', projectId: P.algo,
      title: 'Queue-based inference instead of synchronous requests',
      content: 'Explanations take 5–40 s. Synchronous requests timed out behind the proxy. Decision: enqueue a Celery job, return 202 with a job id, and let the UI poll.',
      problem: 'Long ML inference blocked API workers and hit proxy timeouts.',
      solution: 'Celery + Redis job queue, 202 Accepted + /jobs/{id} polling. Trade-off: more moving parts, but API stays responsive.',
      tags: ['architecture', 'celery', 'redis', 'fastapi'],
      createdAt: ago(50), updatedAt: ago(50), lastReviewedAt: ago(25), nextReviewAt: ago(2), reviewCount: 2, confidence: 2,
    }),
    mem({
      id: 'demo-mem-9', type: 'LINUX',
      title: 'Find which process is using a port',
      problem: 'Address already in use when starting the dev server on :8000.',
      solution: 'List the process listening on the port, then stop it (or pick another port).',
      commands: ['lsof -i :8000', 'ss -ltnp | grep 8000', 'kill -15 <PID>'], tags: ['linux', 'networking'],
      createdAt: ago(27), updatedAt: ago(27), lastReviewedAt: ago(9), nextReviewAt: ago(-5), reviewCount: 3, confidence: 3,
    }),
    mem({
      id: 'demo-mem-10', type: 'SOLUTION', projectId: P.portfolio,
      title: 'S3 static site returns 403 AccessDenied',
      problem: 'CloudFront served 403 for every page after enabling Block Public Access on the bucket.',
      rootCause: 'The bucket was private but CloudFront had no permission to read it.',
      solution: 'Created an Origin Access Control, attached it to the distribution, and added the generated bucket policy. Kept Block Public Access on.',
      commands: ['aws cloudfront create-invalidation --distribution-id $DIST --paths "/*"'], tags: ['aws', 's3', 'deployment'],
      createdAt: ago(70), updatedAt: ago(70), lastReviewedAt: ago(30), nextReviewAt: ago(0, 4), reviewCount: 2, confidence: 1,
    }),
  ];

  const cmd = (o) => ({ userId: 'demo', os: 'any', isFavorite: false, projectId: '', example: '', tags: [], copyCount: 0, lastUsedAt: null, ...o,
    searchKeywords: buildSearchKeywords(o.command, o.description, o.category, o.tags) });
  const commands = [
    cmd({ id: 'demo-cmd-1', command: 'docker compose up -d --build', description: 'Rebuild images and start all services in the background.', category: 'Docker', tags: ['docker'], copyCount: 14, isFavorite: true, projectId: P.drf, lastUsedAt: ago(0, 6), createdAt: ago(40), updatedAt: ago(0, 6) }),
    cmd({ id: 'demo-cmd-2', command: 'docker compose exec web python manage.py migrate', description: 'Run Django migrations inside the running web container.', category: 'Django', tags: ['django', 'docker'], copyCount: 9, projectId: P.drf, createdAt: ago(40), updatedAt: ago(3) }),
    cmd({ id: 'demo-cmd-3', command: 'git log --oneline --graph --decorate -20', description: 'Compact history with branches drawn as a graph.', category: 'Git', tags: ['git'], copyCount: 6, createdAt: ago(60), updatedAt: ago(5) }),
    cmd({ id: 'demo-cmd-4', command: 'git stash push -m "wip: <message>"', description: 'Stash work-in-progress with a label you can find later.', example: 'git stash list\ngit stash pop stash@{0}', category: 'Git', tags: ['git'], copyCount: 3, createdAt: ago(35), updatedAt: ago(35) }),
    cmd({ id: 'demo-cmd-5', command: 'ssh -L 5433:localhost:5432 deploy@api.example.dev', description: 'Tunnel the remote Postgres to localhost:5433 to inspect it safely.', category: 'SSH', os: 'linux', tags: ['ssh', 'postgresql'], copyCount: 2, projectId: P.drf, createdAt: ago(25), updatedAt: ago(25) }),
    cmd({ id: 'demo-cmd-6', command: 'psql -h localhost -U postgres -d app -c "\\dt"', description: 'List tables in a database without opening an interactive shell.', category: 'PostgreSQL', tags: ['postgresql'], copyCount: 4, createdAt: ago(20), updatedAt: ago(20) }),
    cmd({ id: 'demo-cmd-7', command: 'lsof -i :8000', description: 'Show which process is listening on port 8000.', category: 'Networking', os: 'macos', tags: ['linux', 'networking'], copyCount: 7, createdAt: ago(27), updatedAt: ago(2) }),
    cmd({ id: 'demo-cmd-8', command: 'aws s3 sync dist/ s3://example-portfolio --delete', description: 'Upload a static build and remove files that no longer exist.', category: 'AWS', tags: ['aws', 's3'], copyCount: 5, projectId: P.portfolio, createdAt: ago(70), updatedAt: ago(20) }),
  ];

  const snip = (o) => ({ userId: 'demo', isFavorite: false, projectId: '', copyCount: 0, lastUsedAt: null, description: '', ...o,
    searchKeywords: buildSearchKeywords(o.title, o.description, o.language, o.tags) });
  const snippets = [
    snip({ id: 'demo-snip-1', title: 'Retry decorator with exponential backoff', language: 'python', tags: ['python'], isFavorite: true, copyCount: 5,
      description: 'Retries a flaky call (network, rate limits) with backoff and jitter.',
      code: `import random\nimport time\nfrom functools import wraps\n\n\ndef retry(times=3, base_delay=0.5, exceptions=(Exception,)):\n    def decorator(fn):\n        @wraps(fn)\n        def wrapper(*args, **kwargs):\n            for attempt in range(1, times + 1):\n                try:\n                    return fn(*args, **kwargs)\n                except exceptions:\n                    if attempt == times:\n                        raise\n                    time.sleep(base_delay * 2 ** (attempt - 1) + random.random() / 10)\n        return wrapper\n    return decorator\n`,
      createdAt: ago(30), updatedAt: ago(30) }),
    snip({ id: 'demo-snip-2', title: 'Debounce for search inputs', language: 'javascript', tags: ['javascript', 'react'], projectId: P.portfolio, copyCount: 3,
      description: 'Wait until the user stops typing before firing the request.',
      code: `export function debounce(fn, ms = 250) {\n  let timer;\n  return (...args) => {\n    clearTimeout(timer);\n    timer = setTimeout(() => fn(...args), ms);\n  };\n}\n\nconst onSearch = debounce((q) => fetchResults(q), 300);\n`,
      createdAt: ago(0, 1.5), updatedAt: ago(0, 1.5) }),
    snip({ id: 'demo-snip-3', title: 'Find duplicate rows', language: 'sql', tags: ['postgresql', 'database'],
      description: 'Rows sharing the same email, newest first.',
      code: `SELECT email, COUNT(*) AS copies, MAX(created_at) AS latest\nFROM users\nGROUP BY email\nHAVING COUNT(*) > 1\nORDER BY copies DESC;\n`,
      createdAt: ago(18), updatedAt: ago(18) }),
    snip({ id: 'demo-snip-4', title: 'Multi-stage Dockerfile for Django', language: 'dockerfile', tags: ['docker', 'django'], projectId: P.drf, copyCount: 2,
      description: 'Small runtime image: build wheels in one stage, install them in a slim one.',
      code: `FROM python:3.12-slim AS build\nWORKDIR /app\nCOPY requirements.txt .\nRUN pip wheel --no-cache-dir --wheel-dir /wheels -r requirements.txt\n\nFROM python:3.12-slim\nWORKDIR /app\nENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1\nCOPY --from=build /wheels /wheels\nRUN pip install --no-cache-dir /wheels/* && rm -rf /wheels\nCOPY . .\nCMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000"]\n`,
      createdAt: ago(39), updatedAt: ago(39) }),
    snip({ id: 'demo-snip-5', title: 'GitHub Actions: run pytest with Postgres', language: 'yaml', tags: ['python', 'postgresql', 'deployment'],
      description: 'CI job with a Postgres service container.',
      code: `jobs:\n  test:\n    runs-on: ubuntu-latest\n    services:\n      db:\n        image: postgres:16\n        env:\n          POSTGRES_PASSWORD: postgres\n        ports: ["5432:5432"]\n        options: >-\n          --health-cmd pg_isready --health-interval 5s --health-retries 10\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-python@v5\n        with: { python-version: "3.12" }\n      - run: pip install -r requirements.txt\n      - run: pytest -q\n        env:\n          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/postgres\n`,
      createdAt: ago(12), updatedAt: ago(12) }),
    snip({ id: 'demo-snip-6', title: 'fetch with timeout', language: 'typescript', tags: ['typescript', 'api'], projectId: P.algo,
      description: 'Abort a request that takes too long.',
      code: `export async function fetchWithTimeout(url: string, ms = 8000, init: RequestInit = {}): Promise<Response> {\n  const controller = new AbortController();\n  const timer = setTimeout(() => controller.abort(), ms);\n  try {\n    return await fetch(url, { ...init, signal: controller.signal });\n  } finally {\n    clearTimeout(timer);\n  }\n}\n`,
      createdAt: ago(6), updatedAt: ago(6) }),
  ];

  const bm = (o) => ({ userId: 'demo', isFavorite: false, projectId: '', notes: '', description: '', ...o,
    searchKeywords: buildSearchKeywords(o.title, o.description, o.tags, o.category) });
  const bookmarks = [
    bm({ id: 'demo-bm-1', title: 'Django settings reference', url: 'https://docs.djangoproject.com/en/stable/ref/settings/', category: 'documentation', tags: ['django'], description: 'Every Django setting with defaults.', createdAt: ago(40), updatedAt: ago(40) }),
    bm({ id: 'demo-bm-2', title: 'django-cors-headers', url: 'https://github.com/adamchainz/django-cors-headers', category: 'github', tags: ['django', 'cors'], projectId: P.learn, notes: 'Middleware must go above CommonMiddleware.', createdAt: ago(0, 6), updatedAt: ago(0, 6) }),
    bm({ id: 'demo-bm-3', title: 'PostgreSQL index types', url: 'https://www.postgresql.org/docs/current/indexes-types.html', category: 'documentation', tags: ['postgresql', 'database'], isFavorite: true, createdAt: ago(18), updatedAt: ago(18) }),
    bm({ id: 'demo-bm-4', title: 'MDN: Cross-Origin Resource Sharing (CORS)', url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS', category: 'documentation', tags: ['cors', 'api'], createdAt: ago(10), updatedAt: ago(10) }),
    bm({ id: 'demo-bm-5', title: 'Stack Overflow: docker-compose questions', url: 'https://stackoverflow.com/questions/tagged/docker-compose', category: 'stackoverflow', tags: ['docker'], createdAt: ago(21), updatedAt: ago(21) }),
  ];

  const collections = [
    { id: 'demo-col-1', userId: 'demo', name: 'Interview Preparation', icon: '🎯', description: 'Concepts I should be able to explain without notes.',
      items: [{ kind: 'memory', id: 'demo-mem-6' }, { kind: 'memory', id: 'demo-mem-7' }, { kind: 'memory', id: 'demo-mem-8' }, { kind: 'snippet', id: 'demo-snip-3' }], createdAt: ago(14), updatedAt: ago(9) },
    { id: 'demo-col-2', userId: 'demo', name: 'Docker', icon: '🐳', description: 'Containers, compose and networking gotchas.',
      items: [{ kind: 'memory', id: 'demo-mem-1' }, { kind: 'command', id: 'demo-cmd-1' }, { kind: 'command', id: 'demo-cmd-2' }, { kind: 'snippet', id: 'demo-snip-4' }], createdAt: ago(30), updatedAt: ago(21) },
    { id: 'demo-col-3', userId: 'demo', name: 'Backend', icon: '🧱', description: '',
      items: [{ kind: 'memory', id: 'demo-mem-2' }, { kind: 'memory', id: 'demo-mem-5' }, { kind: 'project', id: P.drf }, { kind: 'bookmark', id: 'demo-bm-1' }], createdAt: ago(25), updatedAt: ago(2) },
  ];

  const ratings = ['good', 'hard', 'good', 'easy', 'again', 'good', 'good', 'hard', 'easy', 'good'];
  const reviewed = ['demo-mem-1', 'demo-mem-3', 'demo-mem-4', 'demo-mem-9', 'demo-mem-6', 'demo-mem-7', 'demo-mem-8', 'demo-mem-10', 'demo-mem-4', 'demo-mem-1'];
  const reviews = ratings.map((rating, i) => ({
    id: `demo-rev-${i + 1}`, userId: 'demo', memoryId: reviewed[i], rating, intervalDays: [3, 1, 2, 6, 0.007, 4, 9, 2, 14, 5][i],
    reviewedAt: ago(i, 2), createdAt: ago(i, 2), updatedAt: ago(i, 2),
  }));

  const today = startOfDay(now);
  const at = (h, m) => { const t = today + h * H + m * 60000; return t > now ? t - DAY : t; };
  const act = (id, type, message, ts, refType = '', refId = '') => ({ id, userId: 'demo', type, message, refType, refId, createdAt: ts, updatedAt: ts });
  const activity = [
    act('demo-act-1', 'bug_created', 'Saved Django error', at(9, 31), 'memory', 'demo-mem-2'),
    act('demo-act-2', 'command_created', 'Added Docker command', at(10, 12), 'command', 'demo-cmd-1'),
    act('demo-act-3', 'review_completed', 'Reviewed PostgreSQL memory', at(12, 45), 'memory', 'demo-mem-6'),
    act('demo-act-4', 'project_created', 'Created new project', at(15, 2), 'project', P.learn),
    act('demo-act-5', 'snippet_created', 'Added React snippet', at(18, 22), 'snippet', 'demo-snip-2'),
    act('demo-act-6', 'review_completed', 'Reviewed Git push rejected (non-fast-forward)', ago(1, 3), 'memory', 'demo-mem-4'),
    act('demo-act-7', 'bug_created', 'Saved bug: Celery tasks stuck in PENDING after redeploy', ago(2, 1), 'memory', 'demo-mem-5'),
    act('demo-act-8', 'snippet_created', 'Saved snippet: fetch with timeout', ago(6), 'snippet', 'demo-snip-6'),
    act('demo-act-9', 'memory_created', 'Saved learning: JWT access vs refresh tokens', ago(9), 'memory', 'demo-mem-7'),
  ];

  const profile = {
    uid: 'demo', displayName: 'Demo Developer', email: 'demo@devmemory.app', photoURL: '',
    onboardingCompleted: true, primaryTechnologies: ['Python', 'Django', 'React', 'PostgreSQL', 'Docker'],
    currentProjects: ['AlgoVision AI', 'Django REST API'], theme: 'dark', timezone: 'UTC',
    streak: 7, longestStreak: 12, lastActiveAt: now, createdAt: ago(120), updatedAt: now,
  };

  return { profile, memories, snippets, commands, projects, bookmarks, collections, reviews, activity };
}
