/**
 * Shared CRUD behaviour for user-owned collections. Concrete services
 * (memoryService, snippetService, …) supply validation/normalisation via `prepare`.
 */
import { requireWritable } from './context.js';
import { trackCommit, notifySaved, toast, runAction } from './notify.js';
import { log } from './activityService.js';
import { dataStore } from '../state/dataStore.js';
import { sanitize } from '../data/schema.js';

export function createEntityService({ collection, label, kind, prepare = (r) => r, describe = (r) => r.title, activityType }) {
  const list = () => dataStore.get()[collection];
  const get = (id) => list().find((r) => r.id === id) || null;

  function create(input, { silent = false, activity = true, id = undefined } = {}) {
    const { uid, repos } = requireWritable();
    const record = sanitize(collection, prepare({ ...input, userId: uid }, null));
    const res = trackCommit(repos[collection].create(uid, record, { id }), `create ${collection}`);
    if (!silent) notifySaved(`${label} saved`);
    if (activity) log(activityType || `${kind}_created`, `Saved ${label.toLowerCase()}: ${describe(record)}`, { refType: kind, refId: res.id });
    return res.id;
  }

  function update(id, patch, { silent = false } = {}) {
    const { uid, repos } = requireWritable();
    const current = get(id) || {};
    const merged = prepare({ ...current, ...patch, userId: uid }, current);
    const record = sanitize(collection, merged, { partial: true });
    delete record.createdAt;
    delete record.updatedAt;
    trackCommit(repos[collection].update(uid, id, record), `update ${collection}`);
    if (!silent) notifySaved(`${label} updated`);
    return id;
  }

  /** Delete with an Undo toast that restores the exact record (same id and timestamps). */
  function remove(id, { undo = true } = {}) {
    const { uid, repos } = requireWritable();
    const current = get(id);
    trackCommit(repos[collection].remove(uid, id), `delete ${collection}`);
    if (!undo || !current) { toast(`${label} deleted`); return; }
    toast(`${label} deleted`, {
      duration: 8000,
      action: {
        label: 'Undo',
        onClick: () => runAction(() => {
          const data = sanitize(collection, current, { partial: true });
          trackCommit(repos[collection].create(uid, data, { id, preserveTimestamps: true }), 'undo');
          toast('Restored ✓', { type: 'success' });
        }),
      },
    });
  }

  function toggleFavorite(id) {
    const item = get(id);
    if (!item) return;
    update(id, { isFavorite: !item.isFavorite }, { silent: true });
    toast(item.isFavorite ? 'Removed from favorites' : 'Added to favorites ✓', { type: item.isFavorite ? 'info' : 'success' });
  }

  return { collection, kind, label, list, get, create, update, remove, toggleFavorite };
}
