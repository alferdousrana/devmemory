/**
 * In-memory, read-only repository used in demo mode. Same interface as the
 * Firestore repositories, so pages and services don't know the difference.
 * Demo data never touches Firestore and is never mixed with real user data.
 */
import { DemoWriteError } from '../utils/errors.js';

export class DemoCollectionRepository {
  constructor(name, records = []) {
    this.name = name;
    this.records = records.map((r) => ({ ...r }));
  }
  newId() { return `demo-${Math.random().toString(36).slice(2, 10)}`; }
  subscribe(_uid, onData) {
    queueMicrotask(() => onData(this.records.map((r) => ({ ...r })), { hasPendingWrites: false, fromCache: false }));
    return () => {};
  }
  create() { throw new DemoWriteError(); }
  update() { throw new DemoWriteError(); }
  remove() { throw new DemoWriteError(); }
  async getAll() { return this.records.map((r) => ({ ...r })); }
  async importMany() { throw new DemoWriteError(); }
  async deleteAll() { throw new DemoWriteError(); }
  async queryDueForReview(_uid, now = Date.now()) {
    return this.records.filter((m) => m.nextReviewAt && m.nextReviewAt <= now);
  }
  async queryByProject(_uid, projectId) { return this.records.filter((m) => m.projectId === projectId); }
  async queryByType(_uid, type) { return this.records.filter((m) => m.type === type); }
}

export class DemoUserRepository {
  constructor(profile) { this.profile = profile; }
  async get() { return { ...this.profile }; }
  subscribe(_uid, onData) { queueMicrotask(() => onData({ ...this.profile })); return () => {}; }
  subscribeSettings(_uid, onData) { queueMicrotask(() => onData(null)); return () => {}; }
  create() { throw new DemoWriteError(); }
  update() { throw new DemoWriteError(); }
  saveSettings() { throw new DemoWriteError(); }
  async deleteProfile() { throw new DemoWriteError(); }
}
