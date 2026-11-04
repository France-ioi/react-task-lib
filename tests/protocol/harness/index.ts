/**
 * Selects the implementation under test. `TASK_LIB_IMPL=v4 pnpm test` will run the very same
 * protocol suite against the rewrite once its adapter exists.
 */
import {it} from 'vitest';
import {mountV3} from './v3';
import {mountV4} from './v4';
import {uiV3, uiV4, type UiAccessors} from './ui';
import type {MountFn} from './types';

export const IMPL = process.env['TASK_LIB_IMPL'] ?? 'v3';
const impl = IMPL;

/**
 * A behavior that v3 gets wrong: expected to fail on v3, must pass on v4.
 * `crashes: true` when the v3 failure is an uncaught error that would abort the run (skipped on v3).
 */
export function itV3Bug(name: string, fn: () => Promise<void>, options: {crashes?: boolean} = {}) {
  if (IMPL !== 'v3') return it(name, fn);
  return options.crashes ? it.skip(`[v3 bug] ${name}`, fn) : it.fails(`[v3 bug] ${name}`, fn);
}

const implementations: Record<string, MountFn> = {
  v3: mountV3,
  v4: mountV4,
};

/** Access to the lib's own UI for the implementation under test. */
export const ui: UiAccessors = IMPL === 'v4' ? uiV4 : uiV3;

export const mount: MountFn = (spec) => {
  const fn = implementations[impl];
  if (!fn) throw new Error(`Unknown TASK_LIB_IMPL: ${impl}`);
  return fn(spec);
};

export * from './fakes';
export * from './types';
export {INSTRUCTIONS_HTML} from './page';
