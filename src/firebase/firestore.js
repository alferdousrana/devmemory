/**
 * Cloud Firestore with offline persistence.
 * persistentLocalCache keeps a copy of the user's data in IndexedDB so the app
 * works offline; writes are queued locally and synced when the network returns.
 * Multi-tab manager lets several DevMemory tabs share the cache.
 */
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
  memoryLocalCache, connectFirestoreEmulator, clearIndexedDbPersistence, terminate,
} from 'firebase/firestore';
import { getFirebaseApp } from './config.js';
import { useEmulators } from '../config/firebase.js';

let db = null;
export let persistenceMode = 'none';

export function getDb() {
  if (db) return db;
  const app = getFirebaseApp();
  try {
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
    persistenceMode = 'persistent';
  } catch (err) {
    // e.g. IndexedDB unavailable (some private browsing modes): fall back to memory cache.
    db = initializeFirestore(app, { localCache: memoryLocalCache() });
    persistenceMode = 'memory';
    if (import.meta.env.DEV) console.warn('[DevMemory] Offline persistence unavailable, using memory cache', err);
  }
  if (useEmulators) connectFirestoreEmulator(db, '127.0.0.1', 8080);
  return db;
}

/** Remove the local offline cache (used after account deletion / sign-out on shared devices). */
export async function clearLocalCache() {
  if (!db) return;
  try {
    await terminate(db);
    await clearIndexedDbPersistence(db);
  } catch { /* cache may be in use by another tab */ }
  db = null;
}
