import {pathToFileURL} from 'node:url';
import path from 'node:path';
import {expect, test} from '@playwright/test';

const page = (file: string) => pathToFileURL(path.resolve(import.meta.dirname, '../playground', file)).href;

test.describe('playground opened from file://', () => {
  test('server mode: renders, runs every probe, styles injected', async ({page: browserPage}) => {
    const errors: string[] = [];
    browserPage.on('pageerror', (error) => errors.push(error.message));

    await browserPage.goto(page('index.html'));

    await expect(browserPage.getByTestId('summary')).toHaveText(/^all \d+ probes passed$/);
    await expect(browserPage.getByTestId('mode')).toHaveText('server');
    await expect(browserPage.getByTestId('grader')).toHaveText('remote grader');
    // CSS injected by the bundle (no stylesheet next to it), SVG inlined as data URI.
    await expect(browserPage.locator('style[data-fioi-task]')).toHaveCount(1);
    await expect(browserPage.locator('.playground')).toHaveCSS('display', 'flex');
    await expect(browserPage.locator('.playground__header img')).toHaveAttribute('src', /^data:image\/svg\+xml/);
    expect(errors).toEqual([]);
  });

  test('client mode: the local grader is bundled', async ({page: browserPage}) => {
    await browserPage.goto(page('index.client.html'));

    await expect(browserPage.getByTestId('summary')).toHaveText(/^all \d+ probes passed$/);
    await expect(browserPage.getByTestId('mode')).toHaveText('client');
    await expect(browserPage.getByTestId('grader')).toHaveText('local-grader-is-bundled (grade(3) = 100)');
  });
});
