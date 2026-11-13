// @vitest-environment node
import {mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {afterAll, describe, expect, it} from 'vitest';
import {build} from 'vite';
import {defineTaskConfig} from '../../src/vite';

const work = mkdtempSync(path.join(tmpdir(), 'legal-comments-'));
afterAll(() => rmSync(work, {recursive: true, force: true}));

describe('defineTaskConfig output folder', () => {
  it('keeps license comments (even on inlined code), copies the page and static files', async () => {
    writeFileSync(
      path.join(work, 'lib.js'),
      `/*! Some Icons - CC BY 4.0 */
export function used(x) { return x * 2; }
/** @license MIT - Other lib */
export const unused = () => 'unused';
// regular comment, dropped
export const other = 1;
`,
    );
    writeFileSync(path.join(work, 'entry.js'), `import {used} from './lib.js';\nwindow.result = used(21);\n`);
    writeFileSync(path.join(work, 'page.html'), '<script src="index.js"></script>');
    mkdirSync(path.join(work, 'assets'));
    writeFileSync(path.join(work, 'assets/a.txt'), 'asset');
    const config = defineTaskConfig({
      root: work,
      entry: 'entry.js',
      outDir: 'out',
      page: 'page.html',
      copy: ['assets'],
    })({
      mode: 'production',
    });
    await build({...config, plugins: config.plugins!.slice(1), logLevel: 'silent', configFile: false});

    const output = readFileSync(path.join(work, 'out/index.js'), 'utf8');
    expect(output).toContain('Some Icons - CC BY 4.0');
    expect(output).toContain('@license MIT - Other lib');
    expect(output).not.toContain('regular comment');
    expect(output.match(/Some Icons/g)).toHaveLength(1);
    // page and static files copied next to the bundle
    expect(readFileSync(path.join(work, 'out/index.html'), 'utf8')).toBe('<script src="index.js"></script>');
    expect(readFileSync(path.join(work, 'out/assets/a.txt'), 'utf8')).toBe('asset');
  });
});
