import { dataStore } from '../state/dataStore.js';
import { authState } from '../state/authState.js';

/** Re-run `paint(data, auth)` whenever data (and optionally auth) changes, batched per frame. */
export function watch(paint, { auth = false } = {}) {
  let raf = 0;
  const schedule = () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => paint(dataStore.get(), authState.get()));
  };
  const unsubs = [dataStore.subscribe(schedule)];
  if (auth) unsubs.push(authState.subscribe(schedule));
  paint(dataStore.get(), authState.get());
  return () => { cancelAnimationFrame(raf); unsubs.forEach((u) => u()); };
}
