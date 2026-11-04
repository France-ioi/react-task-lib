#!/usr/bin/env node
/**
 * Manual smoke test on real old browser engines (needs a desktop display):
 *
 *   node scripts/old-browsers-smoke.mjs <browser-command> [args...]
 *   e.g. node scripts/old-browsers-smoke.mjs ~/old/firefox-52/firefox -no-remote -profile /tmp/ff52
 *
 * Opens playground/index.html, index.client.html and task.html (scripted play) from file:// with ?report=…, waits for the
 * probe results sent back by each page, prints them and exits (non-zero on failure / timeout).
 * Build first: `pnpm build && pnpm playground:build`.
 */
import {spawn} from 'node:child_process';
import {createServer} from 'node:http';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const [command, ...args] = process.argv.slice(2);
if (!command) {
  console.error('usage: node scripts/old-browsers-smoke.mjs <browser-command> [args...]');
  process.exit(2);
}
const PAGES = ['index.html', 'index.client.html', 'task.html'];
const TIMEOUT_MS = 90_000;

let pending = null;
const server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://127.0.0.1');
  const data = url.searchParams.get('data');
  res.writeHead(204).end();
  if (data && pending) pending(JSON.parse(data));
});

function openPage(port, page) {
  return new Promise((resolve) => {
    const file = pathToFileURL(path.resolve(import.meta.dirname, '../playground', page));
    file.search = `?report=${encodeURIComponent(`http://127.0.0.1:${port}/report`)}`;
    const browser = spawn(command, [...args, file.href], {stdio: 'ignore'});
    const done = (result) => {
      clearTimeout(timer);
      pending = null;
      browser.kill();
      // Give the browser time to release its profile.
      setTimeout(() => resolve(result), 1500);
    };
    const timer = setTimeout(() => done(null), TIMEOUT_MS);
    pending = done;
  });
}

server.listen(0, '127.0.0.1', async () => {
  const {port} = server.address();
  let failed = false;
  for (const page of PAGES) {
    const result = await openPage(port, page);
    if (!result) {
      console.log(`✗ ${page}: no report (timeout)`);
      failed = true;
      continue;
    }
    const failures = result.results.filter((r) => !r.ok);
    console.log(`${failures.length ? '✗' : '✓'} ${page} — ${result.userAgent}`);
    console.log(
      `    mode=${result.mode} grader=${result.grader} probes=${result.results.length - failures.length}/${result.results.length}`,
    );
    for (const f of failures) console.log(`    FAIL ${f.name}: ${f.detail}`);
    if (failures.length) failed = true;
  }
  server.close();
  process.exit(failed ? 1 : 0);
});
