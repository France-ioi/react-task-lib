# react-task-lib v4 — Implementation Plan

Companion to [`modernization_plan.md`](../modernization_plan.md) (the spec). This document is the
*how*. v4 is a rewrite: the task-author API changes freely, but the **platform protocol is frozen**.

## 1. Constraints recap

| Constraint | Consequence |
|---|---|
| Browsers: Safari 10.1 / Chrome 55 / Firefox 52 / Edge 15 — for the lib **and** tasks | ES2017 output; core-js polyfills; no `<dialog>`, flex `gap`, `ResizeObserver`, `rgb(r g b / a)`; Tailwind v4 is out for tasks (v3.4 with compat config) |
| Task must open from `file://` | Task build = single classic IIFE script, no code-splitting / dynamic `import()`, CSS inlined or `<link>`, assets as data URIs, no workers |
| Same `task.*` / `platform.*` protocol | Protocol tests written against the **current** lib first, then reused unchanged against v4 |
| React 18 or 19, TypeScript, Vite | Develop on React 19, peer `^18.3 \|\| ^19`; strict TS; clean exported types |
| No backward compat for task code | Bundles/linker/sagas/action strings/`state.views` are dropped |

The npm package itself is ESM + `.d.ts` (consumed by the task's bundler); only the **task output**
is IIFE. React is a peer dependency, bundled once by the task.

## 2. Technical choices

### State — Zustand (+ immer) internally, store-agnostic task adapter
- The lib owns its state (platform, task data, levels, grading, hints, UI flags) in an internal
  Zustand store; devtools middleware in development.
- A task plugs in through a typed adapter (`getAnswer` / `loadAnswer` / …). It may use any state
  solution; Zustand + immer is the documented recommendation.
- No redux, redux-saga, typed-redux-saga, linker. The platform protocol becomes plain `async`
  functions.

### CSS — plain SCSS in the lib, Tailwind 3.4 for tasks
- Lib styles: hand-written SCSS, classes prefixed `fioi-` (e.g. `fioi-task-bar`, `fioi-modal`),
  scoped under a `.fioi-root` wrapper so neither Bootstrap nor Tailwind's preflight breaks them.
  Theming through CSS custom properties with fallbacks (`--fioi-primary`, `--fioi-container-width`…).
- Autoprefixer + `stylelint-no-unsupported-browser-features` against the shared browserslist.
- No Bootstrap / react-bootstrap / global FontAwesome in the lib; its ~10 icons become inline SVG
  components. `<fontawesomeicon>` in tutorial HTML is supported through an optional `renderIcon`
  option (tasks that use FontAwesome pass it).
- Layout primitives (`main-block`, `content-block`, headers) become exported components
  (`<Block title=… tutorial=…>`) rather than global class names.
- Tasks: Tailwind **3.4** with the documented compat config:
  - disable opacity core plugins (`textOpacity`, `backgroundOpacity`, `borderOpacity`,
    `divideOpacity`, `placeholderOpacity`, `ringOpacity`) → hex/`rgba()` output;
  - no `gap-*` on flex containers (Safari 14.1), and no CSS grid at all (Chrome 57, Edge 16) —
    flexbox + margins only;
  - autoprefixer + the same stylelint rule.

### Build & tooling
- **Lib build**: Vite library mode → `dist/index.js` (ESM), `dist/vite.js`, `dist/polyfills.js`,
  `dist/style.css`, `.d.ts` via `vite-plugin-dts`.
- **Shared browserslist**: `browserslist` field / `@france-ioi/react-task-lib/browserslist`:
  `safari >= 10.1, chrome >= 55, firefox >= 52, edge >= 15`.
- **Shared task Vite config** — `@france-ioi/react-task-lib/vite`:
  ```ts
  // task vite.config.ts
  import {defineTaskConfig} from '@france-ioi/react-task-lib/vite';
  export default defineTaskConfig({entry: 'src/index.ts', mode: process.env.TASK_MODE /* 'server' | 'client' */});
  ```
  It sets: IIFE single-file output (`inlineDynamicImports`), `build.target`
  `['chrome55','firefox52','safari10.1','edge15']` (lowers syntax in deps too; unlowerable syntax
  fails the build), terser with `safari10: true`, CSS injected into the bundle, assets inlined,
  `process.env.NODE_ENV` define, a `__TASK_MODE__` define replacing `ifdef-loader`/`GENERATE_MODE`,
  dev server opening the task HTML.
- **Polyfills entry** — `@france-ioi/react-task-lib/polyfills`: core-js modules selected from the
  browserslist (`core-js-compat`), plus `URLSearchParams` (Edge 15) and `queueMicrotask`.
  Imported as the first line of a task entry.
- **Quality**: strict TypeScript (no exceptions), ESLint 9 flat config + `typescript-eslint` +
  `eslint-plugin-react-hooks` + `eslint-plugin-compat`, Prettier, stylelint.
- **Compat gates in CI** (no BrowserStack available):
  1. `es-check es2017` on built task bundles (syntax);
  2. `eslint-plugin-compat` on lib + task sources (APIs vs polyfills);
  3. stylelint unsupported-features (CSS);
  4. manual smoke test on **real old engines runnable on Linux**: Firefox 52 ESR
     (ftp.mozilla.org archive) and Chromium 55 (chromium snapshot archive), opening the playground
     and circuit task from `file://`. Safari 10.1 / Edge 15 are covered by gates 1–3 only.
- **Tests**: Vitest + Testing Library (jsdom); Playwright (Chromium/Firefox/WebKit, modern) for E2E.
- **Package manager**: **pnpm** (pinned via `packageManager` + corepack), Node ≥ 20, published to
  GitHub Packages (scoped registry in `.npmrc`, unchanged).
  - Strict `node_modules`: undeclared imports fail (would have caught the missing
    `json-stable-stringify-without-jsonify`).
  - pnpm workspace: the lib stays at the repo root, `playground/` is a workspace package; local consumers (circuit,
    ai-tasks-tools) link with `"@france-ioi/react-task-lib": "link:../react-task-lib"` → replaces
    yalc.
  - Bun was considered: faster installs, but the tooling (Vite, Vitest, Playwright, tsc) runs on
    Node anyway, so the gain is small and its strictness/publishing story is less proven.

### i18n
- i18next kept, but a **private instance** (`createInstance`) so it never clashes with the task's
  own i18next (ai-tasks-tools has one). `language` option; fr/en/de/es resources kept.

## 3. Target API (sketch)

```ts
import '@france-ioi/react-task-lib/polyfills';
import '@france-ioi/react-task-lib/style.css';
import {defineTask, mountTask} from '@france-ioi/react-task-lib';

const task = defineTask<Answer, TaskData, Hint>({
  metaData: {id: '…', language: 'fr', /* … */},
  defaultAnswer: (taskData) => …,
  loadAnswer: (answer, ctx /* {taskData, hints, level} */) => void, // init, reloadAnswer, level switch, restart
  getAnswer: () => Answer,
  getState?: () => unknown,
  loadState?: (dump: unknown) => void,
  onHintsUpdated?: (hints: Hint[]) => void,                        // replaces Task.Refresh
  Workspace: () => JSX.Element,
  levels?: {basic: {version: '1'}, easy: {version: '2', locked: true} /* … */},
  showTaskBar?: boolean, workspaceOnly?: boolean,
});

window.runReact = (container, options) =>
  mountTask(container, options, task, __TASK_MODE__ === 'client' ? {localServer: serverTask} : {});
```

Hooks: `useTaskData()`, `useTaskVersion()`, `useHints()`, `useRequestHint()`, `useHintFeedback()`,
`useValidate()`, `useReadOnly()`, `useValidateButton()` (get/set enabled/disabled/hidden),
`useLevel()`, `useGrading()`, `useTranslation()` (lib instance).

Components: `Block`/`Collapsable`, `Tutorial`, `TaskInstructions`, `TaskBar`, `HintFeedback`,
`NumberPicker`, `Modal`, `Spinner`.

Exported types: `TaskDefinition`, `TaskOptions`, `TaskMetaData`, `TaskData`, `TaskVersion`,
`LevelName`, `LevelConfig`, `GradingResult`, `HintRequestState`, `ValidateButtonStatus`,
`PlatformApi`, `TaskApi` (the `task.*` object), `TaskParams`, `ServerTask` (local grader contract),
`ServerApi`.

## 4. Functional inventory (must behave as today)

1. **`task.*` protocol** — `load, unload, updateToken, getHeight, getMetaData, getViews, showViews,
   getState, reloadState, getAnswer, reloadAnswer, gradeAnswer(answer, answerToken, success, error,
   silent)`; same argument order, callback semantics, JSON string formats (stable stringify).
2. **`platform.*` usage** — `initWithTask, getTaskParams(key, default, ok, err), askHint, validate(mode),
   updateDisplay({height})`; `window.task` exposed.
3. **Server API** — HTTP POST JSON with long polling (`long_polling_id`, 30 tries, `devel` option);
   local grader mode (`taskData`, `gradeAnswer`, `requestHint`, `taskHintData`, `publicData` unwrap,
   signed score/hint tokens).
4. **Tokens** — dummy JWT encode/decode, `sToken` from query string, `window.task_token`,
   `TaskToken` (hint requests, answer tokens), redirect when `version` missing, randomSeed rules
   (`"0"` → query/payload/random, string conversion), `bSubmissionPossible === false` → read-only.
5. **Levels** — per-level token (seed + stars), aggregated answer `{level: answer}`, per-level
   scores with coefficients, reconciled score, best answer, unlocking next level at 100, locked-level
   modal (bypassed on `file:` / localhost), next-level modal, auto level selection after
   `reloadAnswer`, saving + silent grading on level switch, scroll to top.
6. **Hints** — request flow with error codes 10–60, `askHint`, updated token, `taskHintData` reload,
   success/failure feedback, `options.defaults.hints === false` disables hint loading.
7. **Feedback clearing** — grading & hint feedback cleared on user actions (today: action names
   ending in Started/Moved/Changed/Added/Pressed/Reset/Reverted → v4: explicit `clearFeedback()` /
   automatic on `loadAnswer`).
8. **Task bar** — validate (`mode: 'done'`, loading spinner), restart with confirmation, validate
   button status enabled/disabled/hidden, hidden when read-only.
9. **Result display** — HTML message, score (hidden if `version.hints === false` or
   `showScore === false`), error, network error translation.
10. **Content** — `#instructions` / `#<category>` HTML → React, `data-version` filtering, tutorial
    carousel, `<fontawesomeicon>`.
11. **Layout** — height monitor (200 ms) → `updateDisplay`, Bebras iframe full width + Safari
    scrolling fix, `#task` clone, fatal error screen, spinner until ready.
12. **i18n** — fr (default), en, de, es.

## 5. Phases

### Phase 0 — Characterization tests on the current lib ✅
Done on branch `v4`: `tests/protocol/` (57 scenarios, `pnpm test`), see `tests/protocol/README.md`.
Repo switched to pnpm; `json-stable-stringify-without-jsonify` declared; unused `react-scripts` removed.

- Add Vitest + jsdom to the current repo (dev only).
- Harness: fake `window.platform` (records calls, scriptable `getTaskParams`/`askHint`/`validate`),
  fake local `serverTask`, fake HTTP server (`fetch` mock), helper `callTask('getAnswer')` returning
  a promise over the success/error callbacks.
- Scenarios covering §4 items 1–9 (both with and without levels), asserting only on the protocol
  surface (platform calls, callback values, rendered text) — not on Redux internals — so the same
  suite runs against v4 through a thin adapter.
- Fix nothing yet; record known bugs as `it.fails` (e.g. `TaskResult` with null grading).

### Phase 1 — Skeleton & toolchain
- New `src/`, Vite lib config, TS strict, ESLint/Prettier/stylelint, Vitest, Playwright.
- `browserslist`, `vite` preset, `polyfills` entry, CI checks (`es-check`, compat lint).
- `playground/`: minimal sample task (with levels + hints + local grader) using bebras
  `miniPlatform.js`, built with the preset and **opened from `file://`**.

### Phase 2 — Core (no UI)
- `platform/` (task object, platform adapter), `server/` (HTTP + local), `token/`, `levels/`,
  `hints/`, `store/`, `defineTask`, `mountTask`. Plain typed modules, unit-tested.
- Phase 0 suite green against v4.

### Phase 3 — UI
- `TaskBar`, version tabs, `Stars` (`useId`), `TaskResult`, `Modal` (portal, focus trap, Esc,
  backdrop), `Collapsable`/`Block` (height transition), tutorial carousel, `Spinner`,
  `NumberPicker`, `HintFeedback`, inline SVG icons; SCSS + stylelint.
- Component tests + Playwright on the playground.

### Phase 4 — Port `alkindi-task-circuit` (validation only, not published)
- webpack → shared Vite preset (client/server modes); drop legacy polyfill deps.
- Tailwind v4 → 3.4 (`@theme`/`@utility` → `tailwind.config.js`, compat config, remove flex `gap`).
- Bundles/sagas → `defineTask` + Zustand store; react-bootstrap usages → lib `Modal`/own markup.
- Check: `file://` open, server mode, client mode, Playwright scenarios (play, validate, levels,
  hints, restart, reload answer), before/after screenshots, Firefox 52 / Chromium 55 smoke test.

### Phase 5 — ai-tasks-tools & release
- Port the 7 templates; adopt the preset; Tailwind 3.4.
- README + task-author guide (API, preset, browser rules, Tailwind config) + CHANGELOG.
- Publish `4.0.0`.

## 6. Known issues in v3 to not reproduce
Found by the Phase 0 suite (tests marked `itV3Bug`, which must pass on v4):
- Switching level calls `gradeAnswer` with the current level's answer instead of the all-levels
  answer → the "silent grading" on level change is a no-op.
- `gradeAnswer` (levels, not silent) with no answer for the current level stores `grading = null`
  → `TaskResult` crashes and the whole app unmounts.
- The HTTP server API rejects with a message *string*, so the "no internet" translation never
  shows (the raw "Network request failed" is displayed).
- In miniPlatform mode (token given before load, no levels), `options.version` from
  `getTaskParams` is ignored: the token's itemUrl (page URL) decides the version.

Found by reading the code:
- `json-stable-stringify-without-jsonify` imported but not declared.
- `yield select` instead of `yield* select` in `taskLoadEventSaga`.
- `TaskResult` reads `grading.score` when `grading` is null.
- `Stars` regenerates SVG ids on every render.
- `Collapsable` invokes `tutorial.type(props)` directly.
- Hint state reset is wired to `taskInit` under the name `appInitReducer` (keep the behavior —
  reset on version load — but make it explicit).
- Global side effects at import time (`setAutoFreeze(false)`, FontAwesome `library.add`, i18n init).
- Node polyfills (`querystring`, `url`, `buffer`) in a browser lib; dead IE8 shims.
