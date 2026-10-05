import { createEntityService } from './entityService.js';
import { buildSearchKeywords, normalizeTags } from '../utils/keywords.js';
import { codedError } from '../utils/errors.js';
import { copyText } from '../utils/files.js';
import { getContext } from './context.js';
import { toast } from './notify.js';

function prepare(r) {
  const out = { ...r, command: String(r.command || '').trim(), tags: normalizeTags(r.tags) };
  if (!out.command) throw codedError('invalid-argument', 'Enter the command.');
  out.searchKeywords = buildSearchKeywords(out.command, out.description, out.example, out.category, out.tags);
  return out;
}

const base = createEntityService({
  collection: 'commands', label: 'Command', kind: 'command', prepare, describe: (r) => r.command,
});

export const commandService = {
  ...base,
  async copy(id) {
    const c = base.get(id);
    if (!c) return;
    const ok = await copyText(c.command);
    toast(ok ? 'Copied ✓' : 'Couldn’t copy — select the command manually', { type: ok ? 'success' : 'error' });
    if (ok && getContext().mode === 'user') base.update(id, { copyCount: (c.copyCount || 0) + 1, lastUsedAt: Date.now() }, { silent: true });
  },
  frequent(limit = 5) {
    return [...base.list()].sort((a, b) => (b.copyCount || 0) - (a.copyCount || 0) || (b.lastUsedAt || 0) - (a.lastUsedAt || 0)).slice(0, limit);
  },
};
