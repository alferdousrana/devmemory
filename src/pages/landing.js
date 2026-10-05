/** Public landing page. The hero runs the real local parser on a real sentence. */
import { html, render } from '../utils/html.js';
import { icon, logo } from '../components/icons.js';
import { typeBadge } from '../components/ui.js';
import { parseCapture } from '../services/localParser.js';
import { prefersReducedMotion } from '../utils/dom.js';
import { isFirebaseConfigured } from '../config/firebase.js';

const SAMPLE = 'Docker Postgres connection refused because the web container used localhost instead of the db service. Fixed by setting DB_HOST=db in docker-compose.yml';

export default function landing(el) {
  const parsed = parseCapture(SAMPLE);
  render(el, html`
  <div class="landing">
    <header class="landing__nav">
      <a class="brand" href="#/">${logo(28)}<span class="brand__name">DevMemory</span></a>
      <nav class="landing__links" aria-label="Site">
        <a href="#/privacy">Privacy</a>
        <a href="#/login">Sign in</a>
        <a class="btn btn--primary btn--sm" href="#/register">Get started free</a>
      </nav>
    </header>

    <main id="main" class="landing__main" tabindex="-1">
      <section class="hero">
        <div class="hero__copy">
          <h1 class="hero__title">Your developer brain, searchable.</h1>
          <p class="hero__sub">Remember bugs, solutions, snippets, commands and everything you learn while building software.</p>
          <div class="hero__cta">
            <a class="btn btn--primary btn--lg" href="#/register">Get started free</a>
            <a class="btn btn--ghost btn--lg" href="#/demo">${icon('eye', { size: 17 })}Explore demo</a>
          </div>
          <p class="hero__note muted">Free to use. Export everything, any time.${isFirebaseConfigured ? '' : ' This deployment runs in demo mode.'}</p>
        </div>

        <figure class="hero__demo" aria-label="Example: a note becomes a structured memory">
          <div class="term">
            <div class="term__bar"><span></span><span></span><span></span><span class="term__title">Quick capture</span><span class="term__kbd"><kbd>Ctrl</kbd><kbd>⇧</kbd><kbd>M</kbd></span></div>
            <p class="term__input"><span class="term__typed" data-typed></span><span class="term__caret" aria-hidden="true"></span></p>
          </div>
          <div class="parsed-card" data-parsed>
            <div class="parsed-card__row"><span class="parsed-card__key">Title</span><span class="parsed-card__val parsed-card__val--title">${parsed.title}</span></div>
            <div class="parsed-card__row"><span class="parsed-card__key">Type</span><span class="parsed-card__val">${typeBadge(parsed.type)}</span></div>
            <div class="parsed-card__row"><span class="parsed-card__key">Problem</span><span class="parsed-card__val">${parsed.problem}</span></div>
            <div class="parsed-card__row"><span class="parsed-card__key">Solution</span><span class="parsed-card__val">${parsed.solution}</span></div>
            <div class="parsed-card__row"><span class="parsed-card__key">Tags</span><span class="parsed-card__val tags">${parsed.tags.map((t) => html`<span class="tag">#${t}</span>`)}</span></div>
            <div class="parsed-card__warn">${icon('alert', { size: 14 })}You may have solved this before: <strong>PostgreSQL container connection problem</strong></div>
          </div>
          <figcaption class="visually-hidden">The sentence is turned into a title, type, problem, solution and tags without any AI service.</figcaption>
        </figure>
      </section>

      <section class="loop" aria-labelledby="loop-title">
        <h2 id="loop-title" class="section-title">The loop it’s built around</h2>
        <ol class="loop__steps">
          <li><span class="loop__n">1</span><div><h3>Capture in seconds</h3><p>Hit the shortcut from any page and write one messy sentence. DevMemory pulls out the title, problem, fix, commands and tags.</p></div></li>
          <li><span class="loop__n">2</span><div><h3>Find it the next time</h3><p>Search across bugs, snippets, commands, projects and links. Fuzzy matching and synonyms mean “postgres container” finds “PostgreSQL Docker”.</p></div></li>
          <li><span class="loop__n">3</span><div><h3>Keep it</h3><p>A short daily review resurfaces fixes right before you’d forget them. Rate how well you remembered; the schedule adapts.</p></div></li>
        </ol>
      </section>

      <section class="mock" aria-label="Product preview">
        <div class="mock__window">
          <aside class="mock__side">${['Dashboard', 'Review', 'Errors & fixes', 'Snippets', 'Commands', 'Projects'].map((x, i) => html`<span class="${i === 0 ? 'is-on' : ''}">${x}</span>`)}</aside>
          <div class="mock__main">
            <p class="mock__hello">Good morning, Sam 👋</p>
            <div class="mock__brief">
              <div><strong>5</strong> memories to review</div><div><strong>2</strong> unresolved bugs</div><div><strong>1</strong> project needs attention</div>
            </div>
            <ul class="mock__list">
              <li><span class="mock__time">09:31</span>Saved Django error</li>
              <li><span class="mock__time">10:12</span>Added Docker command</li>
              <li><span class="mock__time">12:45</span>Reviewed PostgreSQL memory</li>
            </ul>
          </div>
        </div>
      </section>

      <section class="features" aria-labelledby="features-title">
        <h2 id="features-title" class="section-title">What lives in it</h2>
        <dl class="features__list">
          <div><dt>${icon('bug')}Errors &amp; fixes</dt><dd>Error message, stack trace, environment, root cause and the fix — with a warning when a new bug looks like an old one.</dd></div>
          <div><dt>${icon('code')}Snippets &amp; commands</dt><dd>Highlighted code in 12 languages, one-click copy, and the commands you look up every week.</dd></div>
          <div><dt>${icon('folder')}A brain per project</dt><dd>Stack, run commands, architecture, deployment steps, known bugs and linked memories on one screen.</dd></div>
          <div><dt>${icon('cloudOff')}Works offline</dt><dd>Save while the Wi-Fi is down. Changes sync when you’re back, and you can see when they have.</dd></div>
          <div><dt>${icon('graph')}See how it connects</dt><dd>A graph of memories, tags and projects, plus a monthly recap of what you learned and solved.</dd></div>
          <div><dt>${icon('download')}Your data stays yours</dt><dd>Export to JSON or Markdown, import backups, or delete your account and every record with it.</dd></div>
        </dl>
      </section>

      <section class="cta-band">
        <h2>Stop solving the same bug twice.</h2>
        <div class="hero__cta"><a class="btn btn--primary btn--lg" href="#/register">Get started free</a><a class="btn btn--ghost btn--lg" href="#/demo">Explore demo</a></div>
      </section>
    </main>
    <footer class="landing__foot muted"><span>DevMemory</span><a href="#/privacy">Privacy</a><a href="#/login">Sign in</a></footer>
  </div>`);

  // One orchestrated moment: type the sentence, then reveal the structured result.
  const typed = el.querySelector('[data-typed]');
  const card = el.querySelector('[data-parsed]');
  let timer = 0;
  if (prefersReducedMotion()) {
    typed.textContent = SAMPLE;
    card.classList.add('is-in');
  } else {
    let i = 0;
    const step = () => {
      i = Math.min(SAMPLE.length, i + 2);
      typed.textContent = SAMPLE.slice(0, i);
      if (i < SAMPLE.length) timer = setTimeout(step, 18);
      else timer = setTimeout(() => card.classList.add('is-in'), 250);
    };
    timer = setTimeout(step, 500);
  }
  return () => clearTimeout(timer);
}
