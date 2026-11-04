import fastStableStringify from 'fast-json-stable-stringify';

/**
 * Deterministic JSON.stringify (object keys sorted), used for the answers and states sent to the
 * platform — the format must not change. Same output as json-stable-stringify-without-jsonify,
 * which v3 used (checked in stable_stringify.test.ts).
 *
 * Returns undefined for undefined (like JSON.stringify); throws a TypeError on cycles.
 */
export function stableStringify(value: unknown): string | undefined {
  return fastStableStringify(value) as string | undefined;
}
