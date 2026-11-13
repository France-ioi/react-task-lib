// @vitest-environment node
import {describe, expect, it} from 'vitest';
// @ts-expect-error — plain JS script without type declarations
import {checkSource} from '../../scripts/check-compat.mjs';

const check = (code: string, module = false): string[] => checkSource(code, {module});

describe('check-compat syntax gate', () => {
  it.each([
    ['async/await', 'async function f() { await g(); }'],
    [
      'generators, classes, arrows, template literals',
      'class A { *g() { yield `x${1}`; } m() { return () => 2 ** 3; } }',
    ],
    ['trailing comma in arrays and objects', 'var a = [1, 2,]; var o = {a: 1,};'],
    ['ES2017 regex', 'var r = /a(b)c/gimuy;'],
  ])('accepts %s', (_name, code) => {
    expect(check(code)).toEqual([]);
  });

  it.each([
    ['object spread', 'var a = {...b};'],
    ['object rest', 'var {a, ...rest} = b;'],
    ['optional chaining', 'a?.b;'],
    ['nullish coalescing', 'a ?? b;'],
    ['class fields', 'class A { x = 1; }'],
    ['private methods', 'class A { #x() {} }'],
    ['for await', 'async function f() { for await (const x of y) {} }'],
    ['optional catch binding', 'try {} catch {}'],
    ['regex lookbehind', 'var r = /(?<=a)b/;'],
    ['regex named groups', 'var r = /(?<year>\\d+)/;'],
    ['regex s flag', 'var r = /a.b/s;'],
    ['BigInt literal', 'var n = 1n;'],
  ])('rejects %s', (_name, code) => {
    expect(check(code)[0]).toMatch(/^not ES2017/);
  });

  it('rejects trailing commas in calls and parameter lists (Chrome 55)', () => {
    expect(check('f(a, b,);')).toHaveLength(1);
    expect(check('function f(a, b,) {}')).toHaveLength(1);
    expect(check('f(a,\n  b,\n);')[0]).toMatch(/trailing comma before "\)" at 2:/);
  });

  it('parses ES modules with --module', () => {
    expect(check('import a from "a"; export {a};', true)).toEqual([]);
    expect(check('import a from "a";')[0]).toMatch(/^not ES2017/);
  });
});
