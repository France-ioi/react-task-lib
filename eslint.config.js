// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import compat from 'eslint-plugin-compat';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

/**
 * What @france-ioi/react-task-lib/polyfills (core-js) provides, so that eslint-plugin-compat does
 * not report it: every stable ES built-in ('es:all') and the Web APIs below. Any other API
 * unsupported by the browserslist (ResizeObserver, HTMLDialogElement…) is an error.
 */
const POLYFILLED = [
  'es:all',
  'URL',
  'URLSearchParams',
  'queueMicrotask',
  'structuredClone',
  'DOMException',
  'atob',
  'btoa',
  // Not a polyfill: false positive (MDN records `body` on Document from Firefox 60; it was on
  // HTMLDocument before, in every browser).
  'document.body',
];

export default tseslint.config(
  {
    ignores: ['dist/**', 'playground/build*/**', 'node_modules/**', 'test-results/**', 'playwright-report/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none'},
      ],
      '@typescript-eslint/consistent-type-imports': ['error', {fixStyle: 'inline-type-imports'}],
      eqeqeq: ['error', 'always'],
      'no-console': ['warn', {allow: ['warn', 'error']}],
    },
  },
  // Browser code: library sources and the playground.
  {
    files: ['src/**/*.{ts,tsx}', 'playground/src/**/*.{ts,tsx}'],
    ignores: ['src/vite/**'],
    languageOptions: {globals: {...globals.browser}},
    plugins: {'react-hooks': reactHooks, compat},
    settings: {polyfills: POLYFILLED},
    rules: {
      ...reactHooks.configs.recommended.rules,
      'compat/compat': 'error',
    },
  },
  // Node code: the Vite preset, build scripts, configuration files.
  {
    files: ['src/vite/**/*.ts', 'scripts/**/*.mjs', '*.{js,ts,mjs,mts}', 'playground/*.ts'],
    languageOptions: {globals: {...globals.node}},
    rules: {'no-console': 'off'},
  },
  // Tests.
  {
    files: ['tests/**/*.{ts,tsx}', 'e2e/**/*.ts', 'src/**/*.test.{ts,tsx}'],
    languageOptions: {globals: {...globals.browser, ...globals.node}},
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-function-type': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
  prettier,
);
