import {describe, expect, it} from 'vitest';
// v3 dependency, kept as reference while legacy/v3 exists.
// @ts-expect-error -- untyped package
import referenceStringify from 'json-stable-stringify-without-jsonify';
import {stableStringify} from './stable_stringify';

const samples: unknown[] = [
  null,
  0,
  -1.5,
  'text "quoted" é\n',
  true,
  [],
  {},
  {b: 1, a: 2, c: {z: [3, {y: 1, x: 2}], a: null}},
  [undefined, () => 1, 1],
  {a: undefined, b: () => 1, c: 1},
  {date: new Date(0), nested: {toJSON: () => ({k: 'v'})}},
  {levels: {basic: {value: 3}, easy: null, medium: null}},
  [NaN, Infinity],
];

describe('stableStringify', () => {
  it.each(samples.map((sample) => [JSON.stringify(sample) ?? String(sample), sample]))(
    'matches json-stable-stringify-without-jsonify for %s',
    (_label, sample) => {
      expect(stableStringify(sample)).toBe(referenceStringify(sample));
    },
  );

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
