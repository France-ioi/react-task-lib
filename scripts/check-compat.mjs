#!/usr/bin/env node
/**
 * Syntax gate for the supported browsers (Safari 10.1, Chrome 55, Firefox 52, Edge 15).
 *
 *   node scripts/check-compat.mjs [--module] <file.js>...
 *   (no file: checks the lib dist and the playground builds)
 *
 * 1. The file must parse as ES2017 — this rejects object rest/spread, optional chaining,
 *    nullish coalescing, class fields, async iteration, and ES2018+ regular expression
 *    features (lookbehind, named groups, s flag, \p{...}).
 * 2. No trailing comma in argument/parameter lists (ES2017, but Chrome 55 rejects it).
 *
 * Runtime APIs (Promise.finally, Object.fromEntries…) are not checked here: they are provided by
 * @france-ioi/react-task-lib/polyfills and checked in sources by eslint-plugin-compat.
 */
import {readFileSync, existsSync} from 'node:fs';
import {Parser, tokTypes} from 'acorn';

const DEFAULT_TARGETS = [
  {file: 'dist/index.js', module: true},
  {file: 'dist/polyfills.js', module: true},
  {file: 'playground/build/index.js', module: false},
  {file: 'playground/build-client/index.js', module: false},
];

export function checkSource(code, {module = false} = {}) {
  const errors = [];
  const sourceType = module ? 'module' : 'script';
  try {
    Parser.parse(code, {ecmaVersion: 2017, sourceType, locations: true});
  } catch (e) {
    errors.push(`not ES2017: ${e.message}`);
    return errors;
  }
  let previous = null;
  for (const token of Parser.tokenizer(code, {ecmaVersion: 2017, sourceType, locations: true})) {
    if (token.type === tokTypes.parenR && previous?.type === tokTypes.comma) {
      errors.push(
        `trailing comma before ")" at ${previous.loc.start.line}:${previous.loc.start.column} (unsupported by Chrome 55)`,
      );
    }
    previous = token;
  }
  return errors;
}

function main(argv) {
  const moduleFlag = argv.includes('--module');
  const files = argv.filter((arg) => !arg.startsWith('--'));
  const targets = files.length ? files.map((file) => ({file, module: moduleFlag})) : DEFAULT_TARGETS;
  let failed = false;
  for (const {file, module} of targets) {
    if (!existsSync(file)) {
      console.error(`✗ ${file}: missing (build first)`);
      failed = true;
      continue;
    }
    const errors = checkSource(readFileSync(file, 'utf8'), {module});
    if (errors.length) {
      failed = true;
      console.error(`✗ ${file}`);
      for (const error of errors.slice(0, 20)) console.error(`    ${error}`);
      if (errors.length > 20) console.error(`    … ${errors.length - 20} more`);
    } else {
      console.log(`✓ ${file}`);
    }
  }
  process.exit(failed ? 1 : 0);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main(process.argv.slice(2));
}
