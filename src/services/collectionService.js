import { createEntityService } from './entityService.js';
import { codedError } from '../utils/errors.js';
import { dataStore } from '../state/dataStore.js';
import { toast } from './notify.js';

const KIND_TO_COLLECTION = { memory: 'memories', snippet: 'snippets', command: 'commands', project: 'projects', bookmark: 'bookmarks' };

function prepare(r) {
  const out = { ...r, name: String(r.name || '').trim() };
  if (!out.name) throw codedError('invalid-argument', 'Give the collection a name.');
  return out;
}

const base = createEntityService({ collection: 'collections', label: 'Collection', kind: 'collection', prepare, describe: (r) => r.name });

export const collectionService = {
  ...base,
  addItem(collectionId, kind, id) {
    const c = base.get(collectionId);
    if (!c) return;
    if ((c.items || []).some((i) => i.kind === kind && i.id === id)) { toast(`Already in ${c.name}`); return; }
    base.update(collectionId, { items: [...(c.items || []), { kind, id }] }, { silent: true });
    toast(`Added to ${c.name} ✓`, { type: 'success' });
  },
  removeItem(collectionId, kind, id) {
    const c = base.get(collectionId);
    if (!c) return;
    base.update(collectionId, { items: (c.items || []).filter((i) => !(i.kind === kind && i.id === id)) }, { silent: true });
    toast(`Removed from ${c.name}`);
  },
  /** Resolve item references to records, dropping anything that was deleted. */
  resolve(collection) {
    const d = dataStore.get();
    return (collection?.items || [])
      .map((ref) => ({ kind: ref.kind, record: d[KIND_TO_COLLECTION[ref.kind]]?.find((r) => r.id === ref.id) }))
      .filter((x) => x.record);
  },
  containing(kind, id) {
    return base.list().filter((c) => (c.items || []).some((i) => i.kind === kind && i.id === id));
  },
};
