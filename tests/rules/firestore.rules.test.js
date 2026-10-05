/**
 * Firestore Security Rules tests — run with:  npm run test:rules
 * (starts the Firestore + Storage emulators via firebase-tools; needs Java 11+).
 *
 * Spec scenarios:
 *   User A creates memory → succeeds
 *   User B reads / edits User A's memory → fails
 *   Unauthenticated access to private data → fails
 *   User accesses own data → succeeds
 * Plus field validation (unknown fields, bad types, wrong owner).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs, serverTimestamp } from 'firebase/firestore';

let env;
const memory = (extra = {}) => ({
  userId: 'alice', type: 'BUG', title: 'Postgres connection refused', problem: 'web used localhost', solution: 'DB_HOST=db',
  tags: ['docker'], status: 'resolved', isFavorite: false, isPrivate: true, reviewCount: 0, confidence: 0,
  nextReviewAt: null, lastReviewedAt: null, searchKeywords: ['postgres'], attachments: [],
  createdAt: serverTimestamp(), updatedAt: serverTimestamp(), ...extra,
});

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-devmemory',
    firestore: { rules: readFileSync(resolve(process.cwd(), 'firestore.rules'), 'utf8'), host: '127.0.0.1', port: 8080 },
  });
});
afterAll(async () => { await env?.cleanup(); });
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'users/alice/memories/m1'), memory());
  });
});

const alice = () => env.authenticatedContext('alice').firestore();
const bob = () => env.authenticatedContext('bob').firestore();
const anon = () => env.unauthenticatedContext().firestore();

describe('ownership', () => {
  it('User A can create a memory', async () => {
    await assertSucceeds(setDoc(doc(alice(), 'users/alice/memories/m2'), memory()));
  });
  it('User A can read their own memories', async () => {
    await assertSucceeds(getDoc(doc(alice(), 'users/alice/memories/m1')));
    await assertSucceeds(getDocs(collection(alice(), 'users/alice/memories')));
  });
  it("User B cannot read User A's memory", async () => {
    await assertFails(getDoc(doc(bob(), 'users/alice/memories/m1')));
    await assertFails(getDocs(collection(bob(), 'users/alice/memories')));
  });
  it("User B cannot edit or delete User A's memory", async () => {
    await assertFails(updateDoc(doc(bob(), 'users/alice/memories/m1'), { title: 'pwned', updatedAt: serverTimestamp() }));
    await assertFails(deleteDoc(doc(bob(), 'users/alice/memories/m1')));
  });
  it("User B cannot write into User A's space", async () => {
    await assertFails(setDoc(doc(bob(), 'users/alice/memories/x'), memory({ userId: 'bob' })));
  });
  it('unauthenticated users cannot read or write private data', async () => {
    await assertFails(getDoc(doc(anon(), 'users/alice/memories/m1')));
    await assertFails(getDoc(doc(anon(), 'users/alice')));
    await assertFails(setDoc(doc(anon(), 'users/alice/memories/x'), memory()));
  });
  it("User B cannot read User A's snippets, projects or profile", async () => {
    await assertFails(getDoc(doc(bob(), 'users/alice/snippets/s1')));
    await assertFails(getDoc(doc(bob(), 'users/alice/projects/p1')));
    await assertFails(getDoc(doc(bob(), 'users/alice')));
  });
  it('paths outside users/{uid} are denied', async () => {
    await assertFails(setDoc(doc(alice(), 'public/anything'), { a: 1 }));
    await assertFails(setDoc(doc(alice(), 'users/alice/unknownCollection/x'), { a: 1 }));
  });
});

describe('validation', () => {
  it('rejects unknown fields', async () => {
    await assertFails(setDoc(doc(alice(), 'users/alice/memories/m3'), memory({ isAdmin: true })));
  });
  it('rejects a userId that is not the path owner', async () => {
    await assertFails(setDoc(doc(alice(), 'users/alice/memories/m3'), memory({ userId: 'bob' })));
  });
  it('rejects invalid types and enums', async () => {
    await assertFails(setDoc(doc(alice(), 'users/alice/memories/m3'), memory({ type: 'HACK' })));
    await assertFails(setDoc(doc(alice(), 'users/alice/memories/m3'), memory({ title: '' })));
    await assertFails(setDoc(doc(alice(), 'users/alice/memories/m3'), memory({ tags: 'docker' })));
    await assertFails(setDoc(doc(alice(), 'users/alice/memories/m3'), memory({ sourceUrl: 'javascript:alert(1)' })));
  });
  it('requires timestamps', async () => {
    const { createdAt, ...noCreated } = memory();
    await assertFails(setDoc(doc(alice(), 'users/alice/memories/m3'), noCreated));
  });
  it('accepts a valid profile and rejects a mismatched uid', async () => {
    const profile = { uid: 'alice', displayName: 'Alice', email: 'a@example.com', onboardingCompleted: false, streak: 0, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
    await assertSucceeds(setDoc(doc(alice(), 'users/alice'), profile));
    await assertFails(setDoc(doc(alice(), 'users/alice'), { ...profile, uid: 'bob' }));
  });
  it('bookmarks must have an http(s) URL', async () => {
    const b = { title: 'Docs', url: 'https://docs.djangoproject.com', createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
    await assertSucceeds(setDoc(doc(alice(), 'users/alice/bookmarks/b1'), b));
    await assertFails(setDoc(doc(alice(), 'users/alice/bookmarks/b2'), { ...b, url: 'javascript:alert(1)' }));
  });
  it('reviews and activity are append-only', async () => {
    const r = { memoryId: 'm1', rating: 'good', intervalDays: 1, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
    await assertSucceeds(setDoc(doc(alice(), 'users/alice/reviews/r1'), r));
    await assertFails(updateDoc(doc(alice(), 'users/alice/reviews/r1'), { rating: 'easy' }));
    await assertFails(setDoc(doc(alice(), 'users/alice/reviews/r2'), { ...r, rating: 'perfect' }));
  });
  it('settings live only at settings/profile', async () => {
    const s = { reviewReminders: true, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
    await assertSucceeds(setDoc(doc(alice(), 'users/alice/settings/profile'), s));
    await assertFails(setDoc(doc(alice(), 'users/alice/settings/other'), s));
  });
});
