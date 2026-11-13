// @vitest-environment node
import {readFileSync} from 'node:fs';
import {describe, expect, it} from 'vitest';
import {BROWSERSLIST, BUILD_TARGETS} from '../../src/vite/targets';
// @ts-expect-error — plain JS script without type declarations
import {generatePolyfillsSource} from '../../scripts/polyfills-source.mjs';

const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));

describe('supported browsers', () => {
  it('package.json browserslist matches BROWSERSLIST', () => {
    expect(pkg.browserslist).toEqual(BROWSERSLIST);
  });

  it('BUILD_TARGETS cover the same browsers', () => {
    expect(BUILD_TARGETS).toEqual(['chrome55', 'edge15', 'firefox52', 'safari10.1', 'ios10.3']);
  });

  it('src/polyfills/index.ts is up to date (run `pnpm gen:polyfills`)', () => {
    const current = readFileSync(new URL('../../src/polyfills/index.ts', import.meta.url), 'utf8');
    expect(current).toBe(generatePolyfillsSource());
  });

  it('polyfills include what the targets lack', () => {
    const source: string = generatePolyfillsSource();
    for (const module of [
      'es.promise.finally',
      'es.object.from-entries',
      'es.array.flat',
      'es.string.pad-start',
      'es.global-this',
      'web.url-search-params',
      'web.queue-microtask',
    ]) {
      expect(source).toContain(`core-js/modules/${module}.js`);
    }
  });
});
