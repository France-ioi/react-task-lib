#!/usr/bin/env node
/**
 * Generates src/polyfills/index.ts: the core-js modules needed by the supported browsers
 * (BROWSERSLIST in src/vite/targets.ts). Run `pnpm gen:polyfills` after changing the targets
 * or upgrading core-js; tests/tooling/polyfills.test.ts fails when the file is stale.
 */
import {writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {generatePolyfillsSource} from './polyfills-source.mjs';

const output = fileURLToPath(new URL('../src/polyfills/index.ts', import.meta.url));
writeFileSync(output, generatePolyfillsSource());
console.log(`written ${output}`);
