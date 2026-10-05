/** Profile (users/{uid}), onboarding and settings (users/{uid}/settings/profile). */
import { requireWritable, getContext } from './context.js';
import { trackCommit, notifySaved } from './notify.js';
import { authState } from '../state/authState.js';
import { sanitize, DEFAULTS } from '../data/schema.js';
import { projectService } from './projectService.js';

export const TECH_CHOICES = ['Python', 'JavaScript', 'TypeScript', 'Django', 'React', 'Node', 'PostgreSQL', 'Docker', 'AWS', 'Linux'];

export const profileService = {
  update(patch, { silent = true } = {}) {
    const { uid, repos } = requireWritable();
    const clean = sanitize('users', patch, { partial: true });
    authState.set((s) => ({ profile: { ...s.profile, ...clean } }));
    trackCommit(repos.users.update(uid, clean), 'profile');
    if (!silent) notifySaved('Profile saved');
  },

  async rename(displayName) {
    const name = String(displayName || '').trim().slice(0, 120);
    if (!name) return;
    this.update({ displayName: name }, { silent: false });
    if (getContext().mode === 'user') { try { const { updateDisplayName } = await import('../firebase/auth.js'); await updateDisplayName(name); } catch { /* profile doc is the source of truth */ } }
  },

  completeOnboarding({ technologies = [], project = null }) {
    const patch = { onboardingCompleted: true, primaryTechnologies: technologies };
    if (project?.name) {
      patch.currentProjects = [project.name];
      projectService.create({
        name: project.name, description: project.description || '', techStack: technologies.slice(0, 8), status: 'active',
      }, { silent: true });
    }
    this.update(patch);
  },

  skipOnboarding() { this.update({ onboardingCompleted: true }); },

  settings() { return { ...DEFAULTS.settings, ...(authState.get().settings || {}) }; },

  saveSettings(patch) {
    const { uid, repos } = requireWritable();
    const clean = sanitize('settings', patch, { partial: true });
    const exists = !!authState.get().settings;
    authState.set((s) => ({ settings: { ...DEFAULTS.settings, ...(s.settings || {}), ...clean } }));
    trackCommit(repos.users.saveSettings(uid, exists ? clean : { ...DEFAULTS.settings, ...clean }, exists), 'settings');
    notifySaved('Settings saved');
  },
};
