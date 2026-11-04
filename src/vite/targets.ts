/**
 * Supported browsers — single source of truth.
 * Keep `browserslist` in package.json in sync (checked by tests/tooling/targets.test.ts).
 */
export const BROWSERSLIST = ['safari >= 10.1', 'ios_saf >= 10.3', 'chrome >= 55', 'firefox >= 52', 'edge >= 15'];

/** The same browsers, as build targets for Vite (Oxc lowering) and terser. */
export const BUILD_TARGETS = ['chrome55', 'edge15', 'firefox52', 'safari10.1', 'ios10.3'];
