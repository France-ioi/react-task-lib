#!/usr/bin/env node
/**
 * Runs the playground probes (syntax lowering + polyfills) on an old V8, as a stand-in for
 * Chrome 55 (whose 2016 binaries don't start on current Linux distributions):
 *
 *   node scripts/v8-probes.mjs <path-to-old-node>
 *   e.g. Node 7.10.1 = V8 5.5 = Chrome 55: https://nodejs.org/dist/v7.10.1/
 *
 * Also syntax-checks the playground bundles with that engine (`node --check`).
 * Build first: `pnpm build && pnpm playground:build`.
 */
import {execFileSync} from 'node:child_process';
import {mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {build} from 'vite';
import {defineTaskConfig} from '../dist/vite/index.js';

const oldNode = process.argv[2];
if (!oldNode) {
  console.error('usage: node scripts/v8-probes.mjs <path-to-old-node>');
  process.exit(2);
}
const root = path.resolve(import.meta.dirname, '..');
const v8 = execFileSync(oldNode, ['-p', 'process.versions.v8'], {encoding: 'utf8'}).trim();
console.log(`V8 ${v8}`);

for (const bundle of [
  'playground/build/index.js',
  'playground/build-client/index.js',
  'playground/build-task/index.js',
]) {
  execFileSync(oldNode, ['--check', path.join(root, bundle)], {stdio: 'inherit'});
  console.log(`✓ parses ${bundle}`);
}

const work = mkdtempSync(path.join(tmpdir(), 'v8-probes-'));
try {
  writeFileSync(
    path.join(work, 'entry.ts'),
    `import ${JSON.stringify(path.join(root, 'dist/polyfills.js'))};
import {runProbes} from ${JSON.stringify(path.join(root, 'playground/src/probes'))};
declare const process: {stdout: {write(s: string): void}; exitCode: number};
runProbes().then((results) => {
  const failed = results.filter((r) => !r.ok);
  for (const r of results) process.stdout.write((r.ok ? '  ok   ' : '  FAIL ') + r.name + (r.ok ? '' : ' ' + r.detail) + '\\n');
  process.stdout.write(failed.length ? '✗ ' + failed.length + ' probe(s) failed\\n' : '✓ all ' + results.length + ' probes passed\\n');
  process.exitCode = failed.length ? 1 : 0;
});
`,
  );
  const config = defineTaskConfig({root: work, entry: 'entry.ts', outDir: 'out', globalName: 'Probes'})({
    mode: 'production',
  });
  await build({...config, plugins: [], logLevel: 'warn', configFile: false});
  execFileSync(oldNode, [path.join(work, 'out/index.js')], {stdio: 'inherit'});
} finally {
  rmSync(work, {recursive: true, force: true});
}
