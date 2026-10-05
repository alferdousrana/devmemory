/**
 * Generic repository for a per-user Firestore subcollection:
 *   users/{uid}/{collectionName}/{id}
 *
 * Responsibilities:
 *   • convert epoch-ms ⇄ Firestore Timestamps (the app uses ms everywhere)
 *   • set createdAt/updatedAt with serverTimestamp()
 *   • return writes as { id, committed } — the local cache updates instantly
 *     (works offline); `committed` resolves when the server acknowledges.
 *
 * UI code never touches Firestore; it goes through services → repositories.
 */
import {
  collection, doc, setDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy, limit as qLimit,
  getDocs, writeBatch, serverTimestamp, Timestamp, where,
} from 'firebase/firestore';
import { getDb } from '../firebase/firestore.js';
import { TIME_FIELDS } from '../data/schema.js';

export function toFirestore(data) {
  const out = {};
  for (const [k, v] of Object.entries(data)) {
    if (v === undefined || k === 'id') continue;
    if (TIME_FIELDS.has(k)) out[k] = typeof v === 'number' ? Timestamp.fromMillis(v) : (v ?? null);
    else out[k] = v;
  }
  return out;
}

export function fromSnapshot(snap) {
  const data = snap.data({ serverTimestamps: 'estimate' }) || {};
  const out = { ...data, id: snap.id };
  for (const k of TIME_FIELDS) {
    const v = out[k];
    if (v && typeof v.toMillis === 'function') out[k] = v.toMillis();
  }
  return out;
}

const BATCH_SIZE = 400;

export class FirestoreCollectionRepository {
  /**
   * @param {string} name subcollection name
   * @param {{listenOrderBy?: string, listenLimit?: number}} opts
   *   listenLimit bounds listeners on append-only logs (activity, reviews).
   */
  constructor(name, { listenOrderBy = null, listenLimit = null } = {}) {
    this.name = name;
    this.listenOrderBy = listenOrderBy;
    this.listenLimit = listenLimit;
  }

  col(uid) { return collection(getDb(), 'users', uid, this.name); }
  ref(uid, id) { return doc(getDb(), 'users', uid, this.name, id); }
  newId(uid) { return doc(this.col(uid)).id; }

  /** Live listener. onData(records, {hasPendingWrites, fromCache}). Returns unsubscribe. */
  subscribe(uid, onData, onError) {
    let q = this.col(uid);
    if (this.listenOrderBy) {
      q = this.listenLimit
        ? query(q, orderBy(this.listenOrderBy, 'desc'), qLimit(this.listenLimit))
        : query(q, orderBy(this.listenOrderBy, 'desc'));
    }
    return onSnapshot(
      q,
      { includeMetadataChanges: true },
      (snap) => onData(snap.docs.map(fromSnapshot), {
        hasPendingWrites: snap.metadata.hasPendingWrites,
        fromCache: snap.metadata.fromCache,
      }),
      onError,
    );
  }

  /**
   * Create a document. Pass `id` to choose the id (used by undo and imports).
   * With preserveTimestamps, provided createdAt/updatedAt (ms) are kept.
   */
  create(uid, data, { id, preserveTimestamps = false } = {}) {
    const ref = id ? this.ref(uid, id) : doc(this.col(uid));
    const payload = toFirestore(data);
    if (!preserveTimestamps || !(payload.createdAt instanceof Timestamp)) payload.createdAt = serverTimestamp();
    if (!preserveTimestamps || !(payload.updatedAt instanceof Timestamp)) payload.updatedAt = serverTimestamp();
    return { id: ref.id, committed: setDoc(ref, payload) };
  }

  update(uid, id, patch) {
    const payload = toFirestore(patch);
    delete payload.createdAt;
    payload.updatedAt = serverTimestamp();
    return { id, committed: updateDoc(this.ref(uid, id), payload) };
  }

  remove(uid, id) {
    return { id, committed: deleteDoc(this.ref(uid, id)) };
  }

  async getAll(uid) {
    const snap = await getDocs(this.col(uid));
    return snap.docs.map(fromSnapshot);
  }

  /** Write many records (import). Existing ids are overwritten; caller decides what to pass. */
  async importMany(uid, records) {
    const db = getDb();
    const commits = [];
    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = writeBatch(db);
      for (const rec of records.slice(i, i + BATCH_SIZE)) {
        const payload = toFirestore(rec);
        if (!(payload.createdAt instanceof Timestamp)) payload.createdAt = serverTimestamp();
        payload.updatedAt = payload.updatedAt instanceof Timestamp ? payload.updatedAt : serverTimestamp();
        batch.set(this.ref(uid, rec.id || this.newId(uid)), payload);
      }
      commits.push(batch.commit());
    }
    return Promise.all(commits);
  }

  async deleteAll(uid) {
    const db = getDb();
    const snap = await getDocs(this.col(uid));
    const commits = [];
    for (let i = 0; i < snap.docs.length; i += BATCH_SIZE) {
      const batch = writeBatch(db);
      snap.docs.slice(i, i + BATCH_SIZE).forEach((d) => batch.delete(d.ref));
      commits.push(batch.commit());
    }
    await Promise.all(commits);
    return snap.size;
  }
}

/** Memories add server-side query paths that scale beyond the full-collection listener. */
export class MemoryRepository extends FirestoreCollectionRepository {
  constructor() { super('memories'); }

  /** Uses composite index (status ASC, nextReviewAt ASC). */
  async queryDueForReview(uid, now = Date.now(), max = 50) {
    const q = query(
      this.col(uid),
      where('status', 'in', ['active', 'unresolved', 'investigating', 'resolved']),
      where('nextReviewAt', '<=', Timestamp.fromMillis(now)),
      orderBy('nextReviewAt', 'asc'),
      qLimit(max),
    );
    return (await getDocs(q)).docs.map(fromSnapshot);
  }

  /** Uses composite index (projectId ASC, updatedAt DESC). */
  async queryByProject(uid, projectId, max = 100) {
    const q = query(this.col(uid), where('projectId', '==', projectId), orderBy('updatedAt', 'desc'), qLimit(max));
    return (await getDocs(q)).docs.map(fromSnapshot);
  }

  /** Uses composite index (type ASC, updatedAt DESC). */
  async queryByType(uid, type, max = 100) {
    const q = query(this.col(uid), where('type', '==', type), orderBy('updatedAt', 'desc'), qLimit(max));
    return (await getDocs(q)).docs.map(fromSnapshot);
  }
}

export class SnippetRepository extends FirestoreCollectionRepository { constructor() { super('snippets'); } }
export class CommandRepository extends FirestoreCollectionRepository { constructor() { super('commands'); } }
export class ProjectRepository extends FirestoreCollectionRepository { constructor() { super('projects'); } }
export class BookmarkRepository extends FirestoreCollectionRepository { constructor() { super('bookmarks'); } }
export class CollectionRepository extends FirestoreCollectionRepository { constructor() { super('collections'); } }
export class ReviewRepository extends FirestoreCollectionRepository {
  constructor() { super('reviews', { listenOrderBy: 'createdAt', listenLimit: 500 }); }
}
export class ActivityRepository extends FirestoreCollectionRepository {
  constructor() { super('activity', { listenOrderBy: 'createdAt', listenLimit: 300 }); }
}
