import { createEntityService } from './entityService.js';
import { buildSearchKeywords, normalizeTags } from '../utils/keywords.js';
import { codedError } from '../utils/errors.js';
import { copyText } from '../utils/files.js';
import { getContext } from './context.js';
import { toast } from './notify.js';

function prepare(r) {
  const out = { ...r, title: String(r.title || '').trim(), tags: normalizeTags(r.tags) };
  if (!out.title) throw codedError('invalid-argument', 'Give the snippet a title.');
  if (!String(out.code || '').trim()) throw codedError('invalid-argument', 'Add some code to the snippet.');
  out.searchKeywords = buildSearchKeywords(out.title, out.description, out.language, out.tags, String(out.code).slice(0, 1500));
  return out;
}

const base = createEntityService({ collection: 'snippets', label: 'Snippet', kind: 'snippet', prepare });

export const snippetService = {
  ...base,
  async copy(id) {
    const s = base.get(id);
    if (!s) return;
    const ok = await copyText(s.code);
    toast(ok ? 'Copied ✓' : 'Couldn’t copy — select the code manually', { type: ok ? 'success' : 'error' });
    if (ok && getContext().mode === 'user') base.update(id, { copyCount: (s.copyCount || 0) + 1, lastUsedAt: Date.now() }, { silent: true });
  },
};
