import {readFileSync} from 'node:fs';
import {defineConfig} from 'vitest/config';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {version: string};

export default defineConfig({
  define: {
    __LIB_VERSION__: JSON.stringify(pkg.version),
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['tests/setup.ts'],
    // Protocol scenarios mount a full task with globals (window.task, window.platform…):
    // test files must stay isolated from each other.
    isolate: true,
    testTimeout: 10000,
    projects: [
      {extends: true, test: {name: 'unit', include: ['src/**/*.test.{ts,tsx}', 'tests/tooling/**/*.test.ts']}},
      // Task ⇄ platform protocol (see tests/protocol/README.md).
      {extends: true, test: {name: 'protocol', include: ['tests/protocol/**/*.test.tsx']}},
    ],
  },
});
