/** Current service context: who is signed in and which repositories to use. */
import { codedError, DemoWriteError } from '../utils/errors.js';

let ctx = { uid: null, repos: null, mode: 'guest' };

export function setContext(next) { ctx = { ...next }; }
export function getContext() { return ctx; }
export const isDemo = () => ctx.mode === 'demo';

export function requireContext() {
  if (!ctx.repos || !ctx.uid) throw codedError('unauthenticated');
  return ctx;
}

/** Context for writes — demo mode is read-only. */
export function requireWritable() {
  if (ctx.mode === 'demo') throw new DemoWriteError();
  return requireContext();
}
