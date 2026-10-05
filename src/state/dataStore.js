/**
 * In-memory view of the signed-in user's data, fed by Firestore listeners.
 * Firestore's own offline cache (IndexedDB) is the persistence layer; this
 * store is just what the UI reads. Nothing here is written to localStorage.
 */
import { createStore } from './store.js';
import { COLLECTION_NAMES } from '../data/schema.js';

const empty = () => ({
  memories: [], snippets: [], commands: [], projects: [], bookmarks: [], collections: [], reviews: [], activity: [],
  loaded: {}, errors: {}, version: 0,
});

export const dataStore = createStore(empty());

export const syncState = createStore({
  status: typeof navigator !== 'undefined' && navigator.onLine === false ? 'offline' : 'synced',
  online: typeof navigator === 'undefined' ? true : navigator.onLine !== false,
  demo: false,
});

let unsubs = [];
const pendingBy = {};
let offlineWritesWaiting = false;
let demoMode = false;

const sortKey = (r) => r.updatedAt || r.createdAt || 0;

function updateSync() {
  const online = navigator.onLine !== false;
  const pending = Object.values(pendingBy).some(Boolean);
  const status = demoMode ? 'demo' : !online ? 'offline' : pending ? 'syncing' : 'synced';
  const prev = syncState.get().status;
  syncState.set({ status, online, demo: demoMode });
  if (status === 'synced' && prev !== 'synced' && offlineWritesWaiting) {
    offlineWritesWaiting = false;
    window.dispatchEvent(new CustomEvent('devmemory:synced'));
  }
}

export function markOfflineWrite() { offlineWritesWaiting = true; updateSync(); }

if (typeof window !== 'undefined') {
  window.addEventListener('online', updateSync);
  window.addEventListener('offline', updateSync);
}

export function startDataSync(uid, repos, { demo = false } = {}) {
  stopDataSync();
  demoMode = demo;
  for (const name of COLLECTION_NAMES) {
    const unsub = repos[name].subscribe(
      uid,
      (records, meta) => {
        const sorted = name === 'activity' || name === 'reviews'
          ? records.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
          : records.sort((a, b) => sortKey(b) - sortKey(a));
        dataStore.set((s) => ({
          [name]: sorted,
          loaded: { ...s.loaded, [name]: true },
          errors: { ...s.errors, [name]: null },
          version: s.version + 1,
        }));
        pendingBy[name] = meta?.hasPendingWrites;
        updateSync();
      },
      (err) => {
        dataStore.set((s) => ({ loaded: { ...s.loaded, [name]: true }, errors: { ...s.errors, [name]: err } }));
        window.dispatchEvent(new CustomEvent('devmemory:data-error', { detail: { name, err } }));
      },
    );
    unsubs.push(unsub);
  }
  updateSync();
}

export function stopDataSync() {
  unsubs.forEach((fn) => { try { fn(); } catch { /* ignore */ } });
  unsubs = [];
  for (const k of Object.keys(pendingBy)) delete pendingBy[k];
  demoMode = false;
  dataStore.set(empty());
  updateSync();
}

export const isLoaded = (name) => !!dataStore.get().loaded[name];
export const allLoaded = () => COLLECTION_NAMES.every((n) => dataStore.get().loaded[n]);
