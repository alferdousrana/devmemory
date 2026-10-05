/** Login / Register / Forgot password. */
import { html, render } from '../utils/html.js';
import { icon, logo } from '../components/icons.js';
import { authService } from '../services/authService.js';
import { humanizeError, logError } from '../utils/errors.js';
import { isFirebaseConfigured } from '../config/firebase.js';
import { toast } from '../components/toast.js';

export default function authPage(el, { props, query }) {
  const view = props.view;
  const showEmail = view !== 'login' || query.email === '1';

  const notConfigured = !isFirebaseConfigured ? html`<div class="notice notice--warn" role="note">${icon('alert', { size: 16 })}
    <div><strong>Cloud sync isn’t set up for this deployment.</strong> Add your Firebase config (see README → Firebase setup) to enable accounts. Meanwhile you can explore the demo.</div></div>` : '';

  const titles = {
    login: ['Your developer brain, searchable.', 'Sign in to pick up where you left off.'],
    register: ['Create your DevMemory', 'Start saving what you learn. It takes a minute.'],
    forgot: ['Reset your password', 'We’ll email you a link to choose a new one.'],
  };

  render(el, html`<main id="main" class="auth" tabindex="-1">
    <div class="auth__card">
      <a class="brand auth__brand" href="#/">${logo(32)}<span class="brand__name">DevMemory</span></a>
      <h1 class="auth__title page-title" tabindex="-1">${titles[view][0]}</h1>
      <p class="auth__sub muted">${titles[view][1]}</p>
      ${notConfigured}
      <p class="form-error" role="alert" data-error hidden></p>

      ${view !== 'forgot' ? html`
        <button type="button" class="btn btn--google btn--lg btn--block" data-google ${isFirebaseConfigured ? '' : 'disabled'}>${icon('google', { size: 18 })}Continue with Google</button>
        ${view === 'login' && !showEmail ? html`<button type="button" class="btn btn--ghost btn--lg btn--block" data-show-email ${isFirebaseConfigured ? '' : 'disabled'}>${icon('mail', { size: 18 })}Continue with Email</button>` : ''}
        <div class="auth__divider" ${showEmail ? '' : 'hidden'} data-divider><span>or with email</span></div>` : ''}

      <form class="auth__form" data-form novalidate ${showEmail ? '' : 'hidden'}>
        ${view === 'register' ? html`<label class="field"><span class="field__label">Name</span><input class="input" name="name" autocomplete="name" placeholder="Sam Rahman"></label>` : ''}
        <label class="field"><span class="field__label">Email</span><input class="input" name="email" type="email" autocomplete="email" required inputmode="email"></label>
        ${view !== 'forgot' ? html`<label class="field"><span class="field__label">Password</span>
          <span class="input-wrap"><input class="input" name="password" type="password" required minlength="${view === 'register' ? 8 : 1}" autocomplete="${view === 'register' ? 'new-password' : 'current-password'}">
          <button type="button" class="input-wrap__btn" data-toggle-pw aria-label="Show password" aria-pressed="false">${icon('eye', { size: 16 })}</button></span>
          ${view === 'register' ? html`<span class="field__hint">At least 8 characters.</span>` : ''}</label>` : ''}
        <button type="submit" class="btn btn--primary btn--lg btn--block" ${isFirebaseConfigured ? '' : 'disabled'}>${view === 'login' ? 'Sign in' : view === 'register' ? 'Create account' : 'Send reset link'}</button>
      </form>

      <div class="auth__links">
        ${view === 'login' ? html`<a href="#/forgot">Forgot password?</a><a href="#/register">Create account</a>` : ''}
        ${view === 'register' ? html`<span>Already have an account? <a href="#/login?email=1">Sign in</a></span>` : ''}
        ${view === 'forgot' ? html`<a href="#/login?email=1">${icon('arrowLeft', { size: 14 })}Back to sign in</a>` : ''}
      </div>
      <p class="auth__demo"><a href="#/demo">${icon('eye', { size: 15 })}Explore the demo without an account</a></p>
      ${view === 'register' ? html`<p class="auth__fine muted">By creating an account you agree that your memories are stored in Firebase (Google Cloud). <a href="#/privacy">Read how your data is handled.</a></p>` : ''}
    </div>
  </main>`);

  const errorEl = el.querySelector('[data-error]');
  const form = el.querySelector('[data-form]');
  const showError = (err) => {
    logError(err, 'auth');
    errorEl.textContent = typeof err === 'string' ? err : humanizeError(err);
    errorEl.hidden = false;
  };
  const busy = (btn, on) => { if (!btn) return; btn.disabled = on; btn.classList.toggle('is-busy', on); };

  el.querySelector('[data-google]')?.addEventListener('click', async (e) => {
    errorEl.hidden = true;
    busy(e.currentTarget, true);
    try { await authService.signInWithGoogle(); } catch (err) { if (err?.code !== 'auth/popup-closed-by-user') showError(err); } finally { busy(e.currentTarget, false); }
  });
  el.querySelector('[data-show-email]')?.addEventListener('click', (e) => {
    form.hidden = false; el.querySelector('[data-divider]').hidden = false; e.currentTarget.hidden = true;
    form.elements.email.focus();
  });
  el.querySelector('[data-toggle-pw]')?.addEventListener('click', (e) => {
    const input = form.elements.password;
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    e.currentTarget.setAttribute('aria-pressed', String(show));
    e.currentTarget.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.hidden = true;
    const email = form.elements.email.value.trim();
    if (!/^\S+@\S+\.\S+$/.test(email)) { showError('Enter a valid email address.'); form.elements.email.focus(); return; }
    const btn = form.querySelector('[type="submit"]');
    busy(btn, true);
    try {
      if (view === 'login') await authService.signInWithEmail(email, form.elements.password.value);
      else if (view === 'register') await authService.register({ name: form.elements.name.value, email, password: form.elements.password.value });
      else {
        try { await authService.resetPassword(email); } catch (err) { if (err?.code !== 'auth/user-not-found') throw err; }
        // Same message either way, so the form can't be used to discover accounts.
        toast('If an account exists for that email, a reset link is on its way.', { type: 'success', duration: 7000 });
        location.hash = '#/login?email=1';
      }
    } catch (err) { showError(err); }
    finally { busy(btn, false); }
  });
}
