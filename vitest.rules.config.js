import { defineConfig } from 'vitest/config';
// Security rules tests. Run with `npm run test:rules` (starts the Firebase emulators).
export default defineConfig({
  test: { environment: 'node', include: ['tests/rules/**/*.test.js'], testTimeout: 20000, fileParallelism: false },
});
