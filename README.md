# DevMemory

**Remember what you learned. Find what you solved. Build faster.**

DevMemory is a personal memory system for software developers: bugs and their fixes, error messages, snippets, terminal commands, project setup, architecture decisions, links and everything you learn. It's built around one loop:

```
hit a problem → Quick Capture (one sentence) → DevMemory structures it → saved & synced
      ↑                                                                      ↓
remember it ← review it later ← solve it fast ← find the old fix ← hit it again
```

- **Quick Capture** — `Ctrl/⌘ + Shift + M` from any page. Write *"Django CORS error because frontend origin wasn't allowed. Installed django-cors-headers and added CORS_ALLOWED_ORIGINS."* and you get title, type, problem, solution, tags and `pip install django-cors-headers` — parsed locally, no AI API.
- **"You may have solved this before"** — new memories are compared against old ones (fuzzy + synonyms: "Postgres container" ≈ "PostgreSQL Docker"), with Open / Merge / Save anyway.
- **Error vault, snippet vault (12 languages, highlighted), command vault, projects** with a Quick Context panel and a per-project command center.
- **Search everything** with fuzzy matching, synonyms and filters (`#docker type:bug in:snippets is:fav`). Works offline.
- **Daily review** with lightweight spaced repetition (Again / Hard / Good / Easy, "I forgot this").
- **Insights** — Dev Brief, Memory Health, monthly recap, developer journey timeline, memory graph.
- **Offline-first** — Firestore persistent cache; "Saved locally — will sync when you're online" → "Synced ✓".
- **You own your data** — export JSON/Markdown, import backups, delete all data or your account.

Stack: **HTML/CSS/vanilla JavaScript + Vite**, **Firebase** (Auth, Cloud Firestore, Storage, optional Analytics & App Check). No framework. Deploys to **GitHub Pages** or **Firebase Hosting**.

---

## Contents

1. [Quick start (demo mode, no Firebase)](#quick-start)
2. [Firebase setup, step by step](#firebase-setup)
3. [Environment variables](#environment-variables)
4. [Deploy to GitHub Pages](#deploy-to-github-pages)
5. [Deploy to Firebase Hosting (optional)](#deploy-to-firebase-hosting-optional)
6. [Security model](#security-model)
7. [Architecture](#architecture)
8. [Testing](#testing)
9. [Keyboard shortcuts](#keyboard-shortcuts)
10. [Roadmap / extension points](#roadmap--extension-points)

---

## Quick start

Requires **Node.js 20+**.

```bash
npm install
npm run dev        # http://localhost:5173
```

Without Firebase configuration the app runs in **demo-only mode**: the landing page, privacy page and a full demo with realistic sample data (10 memories, 8 commands, 6 snippets, 4 projects, 5 bookmarks, a review queue) all work. Demo data lives in memory, is clearly labelled, and any save shows *"Create an account to save your memories."*

```bash
npm test           # unit tests (parser, search, spaced repetition, insights, schema↔rules sync, …)
npm run build      # production build → dist/
npm run preview    # serve dist/ locally
```

---

## Firebase setup

You don't need prior Firebase experience. This takes about 15 minutes.

### 1. Go to the Firebase Console
Open <https://console.firebase.google.com> and sign in with a Google account.

### 2. Create a project
Click **Add project**, give it a name (e.g. `devmemory`), and follow the prompts. Google Analytics is optional — DevMemory only uses it if you also opt in inside the app.

### 3. Register a Web App
In the project overview click the **Web** icon (`</>`). Name it `DevMemory`. You don't need Firebase Hosting at this step. Firebase then shows a `firebaseConfig` object — keep this page open; you'll copy these values in step 13.

> You can find it again any time under **Project settings (gear icon) → General → Your apps → SDK setup and configuration → Config**.

### 4. Enable Authentication
Left menu → **Build → Authentication → Get started**.

### 5. Enable the Google provider
**Sign-in method → Add new provider → Google → Enable**. Choose a support email and **Save**.

### 6. Enable Email/Password
**Sign-in method → Add new provider → Email/Password → Enable** (leave "Email link" off) → **Save**.

### 7. Create the Firestore database
**Build → Firestore Database → Create database**. Pick a location close to your users (this can't be changed later). When asked about rules, choose **production mode** — never leave the database in test mode. You'll replace the rules in step 9.

### 8. Enable Storage
**Build → Storage → Get started** → production mode → same location as Firestore.
Storage is only used for optional image attachments. If you skip it, everything else works and the attachment area explains that uploads aren't configured.

> Newer Firebase projects may require the Blaze (pay-as-you-go) plan for Storage. The free usage tier is generous for personal use; set a budget alert in Google Cloud if you upgrade.

### 9. Configure Firestore rules
Firestore → **Rules** tab → replace everything with the contents of [`firestore.rules`](firestore.rules) → **Publish**.

### 10. Configure Storage rules
Storage → **Rules** tab → paste [`storage.rules`](storage.rules) → **Publish**.

> Alternatively, deploy rules and indexes from the command line (also creates the composite indexes):
> ```bash
> cp .firebaserc.example .firebaserc   # put your project ID in it
> npx firebase-tools login
> npm run deploy:rules
> ```
> If you paste rules by hand, also create the indexes listed in [`firestore.indexes.json`](firestore.indexes.json) (see [docs/FIRESTORE_INDEXES.md](docs/FIRESTORE_INDEXES.md)). The app works without them today; they back the scalable query paths.

### 11. Add authorized domains
**Authentication → Settings → Authorized domains**. `localhost` is there by default. Add every domain the app will run on, for example your custom domain.

### 12. Add your GitHub Pages domain
Add `<your-github-username>.github.io` to the same list. Without this, Google sign-in on the deployed site fails with *"This domain isn't authorised for sign-in."*

### 13. Configure environment variables
```bash
cp .env.example .env
```
Fill in `.env` from the config object in step 3:

| `.env` variable | `firebaseConfig` field |
| --- | --- |
| `VITE_FIREBASE_API_KEY` | `apiKey` |
| `VITE_FIREBASE_AUTH_DOMAIN` | `authDomain` |
| `VITE_FIREBASE_PROJECT_ID` | `projectId` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `storageBucket` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `messagingSenderId` |
| `VITE_FIREBASE_APP_ID` | `appId` |
| `VITE_FIREBASE_MEASUREMENT_ID` *(optional)* | `measurementId` |

`.env` is in `.gitignore` — never commit it.

### 14. Run locally
```bash
npm run dev
```
Open <http://localhost:5173>, click **Get started free**, sign in with Google, pick your technologies (or **Skip for now**) and press `Ctrl/⌘ + Shift + M` to capture your first memory.

### 15. Deploy
See [GitHub Pages](#deploy-to-github-pages) or [Firebase Hosting](#deploy-to-firebase-hosting-optional) below.

---

## Environment variables

**Are these secrets?** No. Firebase web config values are *public identifiers* — every Firebase web app sends them to the browser, and anyone can read them from the built JavaScript. Hiding them protects nothing. Your data is protected by:

1. **Firebase Authentication** — proves who the user is.
2. **Firestore and Storage Security Rules** — only let user `X` read and write `users/X/**`, and validate every field.
3. **App Check** *(optional)* — makes it harder for scripts outside your app to call your Firebase project.

What *is* secret and must never appear in this repository or in the frontend: service-account JSON files, the Firebase Admin SDK, and any AI provider API keys (OpenAI, Anthropic, …). DevMemory doesn't use any of them.

Optional variables:

| Variable | Purpose |
| --- | --- |
| `VITE_FIREBASE_MEASUREMENT_ID` | Enables Analytics *only for users who opt in* (Settings → Privacy). Only coarse event names are sent. |
| `VITE_FIREBASE_APPCHECK_SITE_KEY` | reCAPTCHA v3 site key for App Check. Register it in Firebase Console → App Check. |
| `VITE_USE_FIREBASE_EMULATORS` | `true` to connect to the local Emulator Suite. |
| `VITE_BASE_PATH` | Absolute asset base path. Not needed — the default `./` works everywhere because DevMemory uses hash routing. |

---

## Deploy to GitHub Pages

GitHub Pages is **static hosting**: it serves the files in `dist/`. Firebase still handles authentication, the database, file storage and sync — directly from the user's browser.

The workflow is in [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml). It checks out the repo, sets up Node 22, runs `npm ci`, runs the unit tests, builds with `npm run build`, and deploys `dist/`.

1. Push the project to a GitHub repository (branch `main`).
2. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
3. **Settings → Secrets and variables → Actions → Variables tab → New repository variable** — add each `VITE_FIREBASE_*` value from your `.env`.
   They're public identifiers (see above), so *Variables* are appropriate. If you'd rather not show them in the repo settings UI, add them as *Secrets* with the same names instead; the workflow reads either.
4. Add `<username>.github.io` to Firebase authorized domains (setup step 12).
5. Push to `main` (or run the workflow manually from the **Actions** tab). The site appears at `https://<username>.github.io/<repo>/`.

**Why it works under `/<repo>/`:** Vite's `base` is `./` (relative) and routing uses the URL hash (`#/dashboard`), so no 404 rewrites or base-path configuration are needed. If the Firebase variables are missing, the build still succeeds and the site runs in demo-only mode.

---

## Deploy to Firebase Hosting (optional)

Not required if you use GitHub Pages. [`firebase.json`](firebase.json) is already configured (serves `dist/`, long-cache headers for hashed assets, security headers).

```bash
cp .firebaserc.example .firebaserc       # set your project ID
npx firebase-tools login                 # = firebase login
npm run deploy:firebase                  # build + deploy hosting, rules, indexes
```

If you'd rather run `firebase init hosting` yourself: public directory `dist`, **No** to "configure as a single-page app" (hash routing doesn't need it), **No** to overwriting `index.html`. `<project>.web.app` and `<project>.firebaseapp.com` are authorized for sign-in automatically.

---

## Security model

| Threat | Protection |
| --- | --- |
| User B reads or edits User A's data | `firestore.rules`: every path is `users/{uid}/…` and requires `request.auth.uid == uid`. Unknown paths and collections are denied. |
| Writing junk, oversized or extra fields | Per-collection validators: `keys().hasOnly([...])`, required fields, types, enums, size limits, `userId` must equal the path owner, http(s)-only URLs. `tests/schema.test.js` fails if rules and `src/data/schema.js` drift apart. |
| Tampering with review history | `reviews` and `activity` are append-only (no updates). |
| Reading other users' files, uploading scripts | `storage.rules`: owner-only, raster images only (PNG/JPEG/GIF/WebP — SVG blocked), < 5 MB. |
| XSS through saved content | All markup goes through an auto-escaping `html\`\`` template tag (`src/utils/html.js`); links pass through `safeUrl()` (blocks `javascript:`). No `eval`, no `innerHTML` with user strings. highlight.js escapes its input. |
| Leaked credentials | No passwords stored by the app (Firebase Auth handles them). No Admin SDK, no service accounts, no AI keys in the frontend. |
| Account deletion bypass | Requires two confirmations, typing `DELETE`, and re-authentication before any data is touched. |

Things worth knowing (also stated on the in-app Privacy page): the Firebase project owner can access stored data through the console; image download URLs contain an unguessable token, so anyone given such a URL can view that image; the offline cache lives in the browser's IndexedDB.

---

## Architecture

```
index.html, public/ (manifest.json, sw.js, icons)
src/
  main.js                 boot: theme → styles → auth → router → shortcuts → service worker
  router.js               hash router; each page is a lazy-loaded chunk; route guards
  config/firebase.js      env-based Firebase config (+ isFirebaseConfigured)
  firebase/               the ONLY place Firebase SDKs are imported
    config.js             initializeApp (+ optional App Check)
    auth.js               Google/email auth, reset, re-auth, delete
    firestore.js          Firestore with persistentLocalCache (multi-tab), memory fallback
    storage.js            lazy Storage
    analytics.js          opt-in, coarse events only
  repositories/           data access — swap Firestore for anything without touching the UI
    FirestoreCollectionRepository.js   generic users/{uid}/{collection} CRUD, listeners, batches
                                        (+ MemoryRepository with indexed queries)
    UserRepository.js     users/{uid} and users/{uid}/settings/profile
    DemoRepository.js     in-memory, read-only, same interface (demo mode)
    index.js              factories
  services/               business logic; UI never touches Firestore
    authService.js        session orchestration: auth → context → live sync → profile
    memoryService.js snippetService.js commandService.js projectService.js
    bookmarkService.js collectionService.js reviewService.js activityService.js
    searchService.js      provider interface; default = local Fuse.js over the cache
    backupService.js      JSON/Markdown export, import (merge/overwrite), delete all
    localParser.js        Quick Capture text → structured memory (pure function)
    duplicateService.js   "I have seen this before", related memories, duplicate pairs
    insightsService.js    stats, Dev Brief, Memory Health, monthly recap, journey (pure)
    attachmentService.js  image upload/compress/delete
    profileService.js reminderService.js entityService.js context.js notify.js
    ai/aiService.js       generateTitle, extractTags, summarizeMemory, explainError,
                          findRelatedMemories, createFlashcards — local now, remote-ready
  state/                  tiny observable stores: authState, dataStore (+ syncState), draft
  data/schema.js          single source of truth for record shapes (mirrored by the rules)
  data/demoData.js        realistic demo content
  components/             shell, palette, quick capture, modal, toast, editors, code editor, …
  pages/                  one module per route
  styles/                 tokens, base, layout, components, pages (CSS variables, dark/light)
```

**Data flow.** After sign-in, `authService` attaches one Firestore listener per collection under `users/{uid}` (activity and reviews are capped at the newest 300/500). Results go into `dataStore`; pages subscribe and re-render. Writes call `repository.create/update`, which update Firestore's local cache immediately (so the UI updates instantly, online or offline) and return a `committed` promise that resolves when the server acknowledges. Listener metadata (`hasPendingWrites`) drives the ● Synced / ◐ Syncing / ○ Offline indicator.

**Firestore structure** (all under the user's UID):
`users/{uid}` · `settings/profile` · `memories` · `snippets` · `commands` · `projects` · `bookmarks` · `collections` · `reviews` · `activity`

**localStorage** holds only UI preferences (theme, dashboard mode, recent searches, analytics consent) — never user data.

**Performance.** Startup loads about 80 KB of JavaScript (uncompressed). Firebase Auth/Firestore, highlight.js, the code editor, the graph and every page load on demand. Firebase is imported with modular, tree-shakeable entry points only.

**Scaling search.** The default provider searches the locally cached data with Fuse.js (per-token fuzzy matching + synonym expansion). For very large libraries, implement the same `search(query, opts)` interface against Algolia, Typesense or Meilisearch (kept in sync by a Cloud Function) and register it with `setSearchProvider()`. Full-text Firestore queries are deliberately never used.

---

## Testing

```bash
npm test             # 52 unit tests (Vitest + jsdom)
npm run test:rules   # Firestore + Storage security rules against the Firebase Emulator (needs Java 11+)
```

Unit tests cover: the Quick Capture parser (including the exact spec example), keyword normalisation and synonyms, spaced repetition scheduling, duplicate/related detection, insights and Memory Health, local search (synonyms, typos, filters), backup Markdown/JSON serialisation, XSS-safe templating and URL sanitising, schema sanitising, and a check that `firestore.rules` field lists exactly match `src/data/schema.js`.

The rules tests cover the required scenarios — User A creates a memory (allowed); User B reads/edits/deletes it (denied); unauthenticated access (denied); own data (allowed) — plus field validation, append-only reviews, settings path restrictions and Storage ownership/content-type rules.

### What was verified during development, and what wasn't

Verified:
- `npm install`, `npm run build` and `npm test` (52/52 passing).
- A headless Chromium pass over all 24 routes in demo mode at 360, 390, 768 and 1280 px wide, with no console errors, no uncaught exceptions and no horizontal overflow.
- Interaction checks: the Quick Capture shortcut, live parsing, the duplicate warning, demo save blocking, command palette search and keyboard navigation, the review flow (Space and 1–4), the theme toggle, the mobile drawer and the floating capture button.
- A build with Firebase config: Auth initialises, protected routes redirect to login, and a failed sign-in shows a readable message.

**Not verified** — the sandbox had no access to Firebase servers or the emulator download:
- Real Google sign-in and email sign-in/registration/password reset.
- Firestore CRUD against a live project, and offline queueing then sync.
- Image uploads, import into a live account, and account deletion.
- `npm run test:rules` (written, loads correctly, but not executed).
- The GitHub Actions run itself.

Run `npm run test:rules` locally and do a manual pass through sign-in → capture → go offline (DevTools → Network → Offline) → capture → back online before relying on it.

---

## Keyboard shortcuts

| Action | Shortcut |
| --- | --- |
| Quick capture (any page) | `Ctrl/⌘ + Shift + M`, or `C` when not typing |
| Command palette | `Ctrl/⌘ + Shift + P`, `Ctrl/⌘ + K`, or `/` |
| Save in editors | `Ctrl/⌘ + Enter` |
| Review: reveal / rate / forgot | `Space` / `1`–`4` / `F` |
| Close dialog | `Esc` |
| Graph: pan / zoom / reset | arrows / `+` `−` / `0` |

Some browsers reserve `Ctrl/⌘+Shift+M` or `Ctrl/⌘+Shift+P` (Firefox uses the latter for private windows); the single-key alternatives always work.

---

## Roadmap / extension points

- **AI features** — `src/services/ai/aiService.js` defines the interface. Add a Cloud Function that holds the model key, verifies the user's Firebase ID token and calls the model; register it with `setAIProvider(createRemoteProvider({ endpoint, getIdToken }))`. Never put model keys in the frontend.
- **Cloud Functions** — search indexing (Algolia/Typesense/Meilisearch), scheduled review emails, server-side account cleanup.
- **Vector search** — store embeddings per memory (via a function) for semantic "related memories".
- **VS Code extension / GitHub integration** — reuse `localParser` and the repository interfaces; capture straight from the editor or a failing CI run.
- **Team workspaces** — add `workspaces/{id}/…` with membership rules; repositories already isolate the storage path.

---

## License

MIT — see [LICENSE](LICENSE).
