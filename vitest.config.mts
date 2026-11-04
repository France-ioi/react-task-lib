import {defineConfig} from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.{ts,tsx}', 'src/**/*.test.{ts,tsx}'],
    setupFiles: ['tests/setup.ts'],
    // Each scenario mounts a full task app with globals (window.task, window.platform...),
    // so test files must stay isolated from each other.
    isolate: true,
    testTimeout: 10000,
  },
});
