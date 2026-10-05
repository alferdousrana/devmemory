/** Storage Security Rules tests — run with: npm run test:rules */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, describe, it } from 'vitest';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { ref, uploadBytes, getBytes, deleteObject } from 'firebase/storage';

let env;
const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-devmemory',
    storage: { rules: readFileSync(resolve(process.cwd(), 'storage.rules'), 'utf8'), host: '127.0.0.1', port: 9199 },
  });
});
afterAll(async () => { await env?.cleanup(); });

const store = (uid) => (uid ? env.authenticatedContext(uid) : env.unauthenticatedContext()).storage();
const path = 'users/alice/attachments/m1/shot.png';

describe('attachments', () => {
  it('owner can upload, read and delete an image', async () => {
    await assertSucceeds(uploadBytes(ref(store('alice'), path), png, { contentType: 'image/png' }));
    await assertSucceeds(getBytes(ref(store('alice'), path)));
    await assertSucceeds(deleteObject(ref(store('alice'), path)));
  });
  it("User B cannot read or write User A's files", async () => {
    await uploadBytes(ref(store('alice'), path), png, { contentType: 'image/png' });
    await assertFails(getBytes(ref(store('bob'), path)));
    await assertFails(uploadBytes(ref(store('bob'), 'users/alice/attachments/m1/x.png'), png, { contentType: 'image/png' }));
    await assertFails(deleteObject(ref(store('bob'), path)));
  });
  it('unauthenticated users are denied', async () => {
    await assertFails(getBytes(ref(store(null), path)));
  });
  it('rejects non-images and SVG', async () => {
    await assertFails(uploadBytes(ref(store('alice'), 'users/alice/attachments/m1/a.html'), png, { contentType: 'text/html' }));
    await assertFails(uploadBytes(ref(store('alice'), 'users/alice/attachments/m1/a.svg'), png, { contentType: 'image/svg+xml' }));
  });
});
