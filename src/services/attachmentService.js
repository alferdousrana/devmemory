/** Image attachments for memories — Firebase Storage, metadata on the memory doc. */
import { requireWritable, getContext } from './context.js';
import { getStorageApi } from '../firebase/storage.js';
import { codedError } from '../utils/errors.js';

const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];

/** Downscale very large screenshots before upload (keeps storage and bandwidth small). */
async function compress(file) {
  if (file.type === 'image/gif' || file.size < 600 * 1024 || typeof createImageBitmap !== 'function') return { blob: file, width: 0, height: 0 };
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 1920 / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * scale); const h = Math.round(bmp.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    canvas.getContext('2d').drawImage(bmp, 0, 0, w, h);
    const blob = await new Promise((r) => canvas.toBlob(r, 'image/webp', 0.86));
    return blob && blob.size < file.size ? { blob, width: w, height: h, type: 'image/webp' } : { blob: file, width: bmp.width, height: bmp.height };
  } catch { return { blob: file, width: 0, height: 0 }; }
}

export const attachmentService = {
  validate(file) {
    if (!TYPES.includes(file.type)) throw codedError('upload/type');
    if (file.size > MAX_BYTES * 4) throw codedError('upload/too-large');
  },

  async upload(memoryId, file, onProgress) {
    const { uid } = requireWritable();
    if (navigator.onLine === false) throw codedError('upload/offline');
    this.validate(file);
    const { blob, width, height, type } = await compress(file);
    if (blob.size > MAX_BYTES) throw codedError('upload/too-large');
    const { storage, ref, uploadBytesResumable, getDownloadURL } = await getStorageApi();
    const safeName = file.name.replace(/[^\w.-]+/g, '_').slice(-80) || 'image';
    const path = `users/${uid}/attachments/${memoryId}/${Date.now()}-${safeName}`;
    const task = uploadBytesResumable(ref(storage, path), blob, { contentType: type || file.type });
    await new Promise((resolve, reject) => {
      task.on('state_changed', (s) => onProgress?.(s.bytesTransferred / s.totalBytes), reject, resolve);
    });
    const url = await getDownloadURL(task.snapshot.ref);
    return { path, url, name: file.name.slice(0, 200), size: blob.size, contentType: type || file.type, width, height };
  },

  async remove(attachment) {
    requireWritable();
    const { storage, ref, deleteObject } = await getStorageApi();
    try { await deleteObject(ref(storage, attachment.path)); }
    catch (err) { if (err?.code !== 'storage/object-not-found') throw err; }
  },

  /** Delete every attachment the user owns (account / data deletion). */
  async deleteAll() {
    const { uid, mode } = getContext();
    if (mode !== 'user') return 0;
    let api;
    try { api = await getStorageApi(); } catch { return 0; }
    const { storage, ref, listAll, deleteObject } = api;
    let count = 0;
    const walk = async (r) => {
      const res = await listAll(r);
      await Promise.all(res.items.map((i) => deleteObject(i).then(() => { count++; }).catch(() => {})));
      for (const p of res.prefixes) await walk(p);
    };
    try { await walk(ref(storage, `users/${uid}/attachments`)); } catch { /* nothing stored */ }
    return count;
  },

  usage(memories) {
    let bytes = 0; let files = 0;
    for (const m of memories) for (const a of m.attachments || []) { bytes += Number(a.size) || 0; files++; }
    return { bytes, files };
  },
};
