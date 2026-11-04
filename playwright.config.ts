import {defineConfig, devices} from '@playwright/test';

/**
 * E2E tests open built tasks straight from file:// (like a task downloaded on a computer),
 * so they need `pnpm build && pnpm playground:build` first (done by `pnpm ci`).
 * Locally, WebKit needs system libraries: `sudo pnpm exec playwright install-deps webkit`.
 */
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  reporter: process.env['CI'] ? [['github'], ['html', {open: 'never'}]] : 'list',
  use: {trace: 'retain-on-failure'},
  projects: [
    {name: 'chromium', use: {...devices['Desktop Chrome']}},
    {name: 'firefox', use: {...devices['Desktop Firefox']}},
    {name: 'webkit', use: {...devices['Desktop Safari']}},
  ],
});
