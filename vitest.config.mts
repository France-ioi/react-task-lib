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
      // The same protocol suite against both implementations (see tests/protocol/README.md).
      {
        extends: true,
        test: {name: 'protocol-v4', include: ['tests/protocol/**/*.test.tsx'], env: {TASK_LIB_IMPL: 'v4'}},
      },
      {
        extends: true,
        test: {name: 'protocol-v3', include: ['tests/protocol/**/*.test.tsx'], env: {TASK_LIB_IMPL: 'v3'}},
      },
    ],
  },
});
