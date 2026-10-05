/** users/{uid} profile document and users/{uid}/settings/profile. */
import { doc, getDoc, setDoc, updateDoc, deleteDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { getDb } from '../firebase/firestore.js';
import { toFirestore, fromSnapshot } from './FirestoreCollectionRepository.js';

export class UserRepository {
  ref(uid) { return doc(getDb(), 'users', uid); }
  settingsRef(uid) { return doc(getDb(), 'users', uid, 'settings', 'profile'); }

  async get(uid) {
    const snap = await getDoc(this.ref(uid));
    return snap.exists() ? fromSnapshot(snap) : null;
  }

  create(uid, profile) {
    const payload = toFirestore({ ...profile, uid });
    payload.createdAt = serverTimestamp();
    payload.updatedAt = serverTimestamp();
    return { committed: setDoc(this.ref(uid), payload) };
  }

  update(uid, patch) {
    const payload = toFirestore(patch);
    delete payload.createdAt; delete payload.uid;
    payload.updatedAt = serverTimestamp();
    return { committed: updateDoc(this.ref(uid), payload) };
  }

  subscribe(uid, onData, onError) {
    return onSnapshot(this.ref(uid), (snap) => onData(snap.exists() ? fromSnapshot(snap) : null), onError);
  }

  subscribeSettings(uid, onData, onError) {
    return onSnapshot(this.settingsRef(uid), (snap) => onData(snap.exists() ? fromSnapshot(snap) : null), onError);
  }

  saveSettings(uid, settings, exists) {
    const payload = toFirestore(settings);
    payload.updatedAt = serverTimestamp();
    if (!exists) payload.createdAt = serverTimestamp();
    else delete payload.createdAt;
    return { committed: setDoc(this.settingsRef(uid), payload, { merge: true }) };
  }

  async deleteProfile(uid) {
    await deleteDoc(this.settingsRef(uid)).catch(() => {});
    await deleteDoc(this.ref(uid));
  }
}
