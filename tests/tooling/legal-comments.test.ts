// @vitest-environment node
import {mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {afterAll, describe, expect, it} from 'vitest';
import {build} from 'vite';
import {defineTaskConfig} from '../../src/vite';

const work = mkdtempSync(path.join(tmpdir(), 'legal-comments-'));
afterAll(() => rmSync(work, {recursive: true, force: true}));

describe('defineTaskConfig keeps license comments in minified bundles', () => {
  it('keeps /*! … */ and @license comments, even on inlined or tree-shaken code', async () => {
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
    const config = defineTaskConfig({root: work, entry: 'entry.js', outDir: 'out'})({mode: 'production'});
    await build({...config, plugins: config.plugins!.slice(1), logLevel: 'silent', configFile: false});

    const output = readFileSync(path.join(work, 'out/index.js'), 'utf8');
    expect(output).toContain('Some Icons - CC BY 4.0');
    expect(output).toContain('@license MIT - Other lib');
    expect(output).not.toContain('regular comment');
    expect(output.match(/Some Icons/g)).toHaveLength(1);
  });
});
