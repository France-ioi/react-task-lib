import {describe, expect, it} from 'vitest';
import {stableStringify} from './stable_stringify';

/**
 * Reference outputs of json-stable-stringify-without-jsonify, the serializer of v3 (frozen when
 * legacy/v3 was removed): the JSON sent to the platform (answers, states) must not change.
 */
const REFERENCE: [string, unknown, string][] = [
  ['null', null, 'null'],
  ['zero', 0, '0'],
  ['negative float', -1.5, '-1.5'],
  ['string with quotes, accent, newline', 'text "quoted" é\n', '"text \\"quoted\\" é\\n"'],
  ['boolean', true, 'true'],
  ['empty array', [], '[]'],
  ['empty object', {}, '{}'],
  [
    'nested objects: keys sorted at every level',
    {b: 1, a: 2, c: {z: [3, {y: 1, x: 2}], a: null}},
    '{"a":2,"b":1,"c":{"a":null,"z":[3,{"x":2,"y":1}]}}',
  ],
  ['array: undefined and functions become null', [undefined, () => 1, 1], '[null,null,1]'],
  ['object: undefined and functions skipped', {a: undefined, b: () => 1, c: 1}, '{"c":1}'],
  [
    'toJSON honored (Date, custom)',
    {date: new Date(0), nested: {toJSON: () => ({k: 'v'})}},
    '{"date":"1970-01-01T00:00:00.000Z","nested":{"k":"v"}}',
  ],
  [
    'multi-level answer',
    {levels: {basic: {value: 3}, easy: null, medium: null}},
    '{"levels":{"basic":{"value":3},"easy":null,"medium":null}}',
  ],
  ['non-finite numbers', [NaN, Infinity], '[null,null]'],
];

describe('stableStringify', () => {
  it.each(REFERENCE)('same output as v3: %s', (_name, value, expected) => {
    expect(stableStringify(value)).toBe(expected);
  });

  it('sorts keys', () => {
    expect(stableStringify({b: 1, a: {d: 1, c: 2}})).toBe('{"a":{"c":2,"d":1},"b":1}');
  });

  it('returns undefined for undefined', () => {
    expect(stableStringify(undefined)).toBeUndefined();
  });

  it('throws on cycles but accepts repeated (non-cyclic) references', () => {
    const shared = {x: 1};
    expect(stableStringify({a: shared, b: shared})).toBe('{"a":{"x":1},"b":{"x":1}}');
    const cyclic: Record<string, unknown> = {};
    cyclic['self'] = cyclic;
    expect(() => stableStringify(cyclic)).toThrow(TypeError);
  });
});
