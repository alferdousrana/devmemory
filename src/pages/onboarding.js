/** First run: technologies → optional project → finish. Skippable at every step. */
import { html, render } from '../utils/html.js';
import { logo, icon } from '../components/icons.js';
import { profileService, TECH_CHOICES } from '../services/profileService.js';
import { authState } from '../state/authState.js';
import { runAction } from '../services/notify.js';

export default function onboarding(el) {
  const name = (authState.get().profile?.displayName || '').split(' ')[0];
  const state = { step: 1, techs: new Set(authState.get().profile?.primaryTechnologies || []), other: '', project: { name: '', description: '' } };

  const finish = () => runAction(() => {
    const techs = [...state.techs, ...state.other.split(',').map((s) => s.trim()).filter(Boolean)];
    profileService.completeOnboarding({ technologies: techs, project: state.project.name.trim() ? state.project : null });
    location.hash = '#/dashboard';
  });
  const skip = () => runAction(() => { profileService.skipOnboarding(); location.hash = '#/dashboard'; });

  const paint = () => {
    render(el, html`<main id="main" class="onboard" tabindex="-1">
      <div class="onboard__card">
        <div class="onboard__top">${logo(28)}<span class="muted small">Step ${state.step} of 2</span></div>
        <div class="progress" role="progressbar" aria-valuemin="1" aria-valuemax="2" aria-valuenow="${state.step}" aria-label="Setup progress"><span style="width:${state.step * 50}%"></span></div>
        ${state.step === 1 ? html`
          <h1 class="page-title" tabindex="-1">Welcome to DevMemory${name ? html`, ${name}` : ''}.</h1>
          <p class="muted">What technologies do you use? This tunes tags and suggestions. You can change it later.</p>
          <fieldset class="chips-pick"><legend class="visually-hidden">Technologies</legend>
            ${TECH_CHOICES.map((t) => html`<label class="chip-toggle"><input type="checkbox" value="${t}" ${state.techs.has(t) ? 'checked' : ''} data-tech><span>${t}</span></label>`)}
          </fieldset>
          <label class="field"><span class="field__label">Other</span><input class="input" data-other value="${state.other}" placeholder="Go, Rust, Kubernetes…"></label>
          <div class="onboard__actions"><button type="button" class="btn btn--link" data-skip>Skip for now</button><button type="button" class="btn btn--primary" data-next>Continue</button></div>
        ` : html`
          <h1 class="page-title" tabindex="-1">What are you building?</h1>
          <p class="muted">Optional. Memories, commands and bugs can be linked to a project so it builds its own context.</p>
          <label class="field"><span class="field__label">Project name</span><input class="input" data-pname value="${state.project.name}" placeholder="AlgoVision AI" autofocus></label>
          <label class="field"><span class="field__label">One-line description</span><input class="input" data-pdesc value="${state.project.description}" placeholder="What it does, for whom"></label>
          <div class="onboard__actions"><button type="button" class="btn btn--ghost" data-back>${icon('arrowLeft', { size: 15 })}Back</button><span class="spacer"></span><button type="button" class="btn btn--link" data-skip>Skip for now</button><button type="button" class="btn btn--primary" data-finish>Finish setup</button></div>
        `}
      </div>
    </main>`);
    el.querySelector('.page-title')?.focus();
  };

  el.addEventListener('change', (e) => {
    if (e.target.matches('[data-tech]')) { if (e.target.checked) state.techs.add(e.target.value); else state.techs.delete(e.target.value); }
  });
  el.addEventListener('input', (e) => {
    if (e.target.matches('[data-other]')) state.other = e.target.value;
    if (e.target.matches('[data-pname]')) state.project.name = e.target.value;
    if (e.target.matches('[data-pdesc]')) state.project.description = e.target.value;
  });
  el.addEventListener('click', (e) => {
    if (e.target.closest('[data-next]')) { state.step = 2; paint(); }
    else if (e.target.closest('[data-back]')) { state.step = 1; paint(); }
    else if (e.target.closest('[data-skip]')) skip();
    else if (e.target.closest('[data-finish]')) finish();
  });
  el.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.matches('[data-pname], [data-pdesc]')) finish(); });
  paint();
}
