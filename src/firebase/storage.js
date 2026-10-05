/** Firebase Storage — loaded lazily, only when the user works with attachments. */
import { isStorageConfigured, useEmulators } from '../config/firebase.js';
import { getFirebaseApp } from './config.js';

let storageMod = null;
let storage = null;

export async function getStorageApi() {
  if (!isStorageConfigured) {
    const e = new Error('Storage not configured'); e.code = 'app/not-configured'; throw e;
  }
  if (!storageMod) storageMod = await import('firebase/storage');
  if (!storage) {
    storage = storageMod.getStorage(getFirebaseApp());
    if (useEmulators) storageMod.connectStorageEmulator(storage, '127.0.0.1', 9199);
  }
  return { storage, ...storageMod };
}
