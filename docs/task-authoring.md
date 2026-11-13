# Writing a task with react-task-lib v4

A task is a React component plus a few functions describing its answer. The lib implements the
Bebras integration API (`task.load`, `task.getAnswer`, `task.reloadAnswer`, `task.gradeAnswer`…,
`platform.validate`, `platform.askHint`…), the grader calls (HTTP or local), levels, hints, the
task bar and the result display.

Complete examples: `playground/src/task/` (counter task) and `ai-tasks-tools` (7 templates, a shared bundle).

## 1. Project setup

```jsonc
// package.json
{
  "private": true,
  "type": "module",
  "scripts": {
    "build": "vite build",
    "build:client": "TASK_MODE=client vite build",
    "dev": "vite build --watch --mode development",
    "typecheck": "tsc --noEmit",
    "check:compat": "fioi-check-compat build/index.js"
  },
  "browserslist": ["safari >= 10.1", "ios_saf >= 10.3", "chrome >= 55", "firefox >= 52", "edge >= 15"],
  "dependencies": {
    "@france-ioi/react-task-lib": "^4.0.0",
    "react": "^19.3.1",
    "react-dom": "^19.3.1",
    "zustand": "^5.0.16"
  },
  "devDependencies": {"tailwindcss": "^3.4.17", "typescript": "~6.0.3", "vite": "^8.3.5"},
  "packageManager": "pnpm@10.10.0"
}
```

```ts
// vite.config.ts
import tailwindcss from 'tailwindcss';
import {defineTaskConfig} from '@france-ioi/react-task-lib/vite';

export default defineTaskConfig({
  entry: 'src/index.ts',
  page: 'index.prod.html',        // copied to build/index.html
  copy: ['bebras-modules', 'assets'],
  postcssPlugins: [tailwindcss()],
});
```

`defineTaskConfig` builds **one classic script** (`build/index.js`, an IIFE with the CSS and assets
inlined) that runs from `file://` on every supported browser: syntax lowered to Chrome 55 /
Safari 10.1, minified with terser (`safari10` workarounds), license comments kept.

| Option | Default | |
|---|---|---|
| `entry` | `'src/index.ts'` | Entry point. |
| `mode` | `TASK_MODE` env, else `'server'` | Value of the `__TASK_MODE__` constant (`'server'` or `'client'`). |
| `globalName` | `'ReactTask'` | Global holding the entry module's exports. |
| `outDir`, `fileName` | `'build'`, `'index.js'` | |
| `inlineCss` | `true` | `false`: emit `index.css` next to the script instead. |
| `page` | — | HTML page copied as `<outDir>/index.html`. |
| `copy` | — | Files or folders copied into `outDir`. |
| `postcssPlugins` | — | Run before autoprefixer (e.g. Tailwind). |
| `plugins`, `overrides` | — | Extra Vite plugins; config merged last. |
| `devPage` | `'/index.html'` | Page opened by the dev server. |

`tsconfig.json`: `"moduleResolution": "Bundler"`, `"jsx": "react-jsx"`, and
`"types": ["vite/client", "@france-ioi/react-task-lib/task-env"]` (declares `__TASK_MODE__`).

## 2. The task definition

```tsx
// src/index.ts
import '@france-ioi/react-task-lib/polyfills'; // first
import '@france-ioi/react-task-lib/style.css';
import './style.css';

import {defineTask, mountTask, type TaskData, type TaskOptions} from '@france-ioi/react-task-lib';
import {create} from 'zustand';

interface Answer {value: number}
interface MyTaskData extends TaskData {version: {version: string}; target: number}

const useStore = create<Answer>()(() => ({value: 0}));

const task = defineTask<Answer, MyTaskData>({
  metaData: {id: 'http://example.org/tasks/counter', language: 'fr', fullFeedback: true, usesRandomSeed: true, autoHeight: true},
  defaultAnswer: () => ({value: 0}),
  loadAnswer: (answer) => useStore.setState(answer, true),
  getAnswer: () => useStore.getState(),
  subscribe: (listener) => useStore.subscribe(listener),
  Workspace,
});

window.runReact = (container: HTMLElement, options: TaskOptions) => mountTask(container, options, task);
```

| Field | |
|---|---|
| `metaData` | Returned by `task.getMetaData`. |
| `defaultAnswer(taskData)` | The answer of a fresh task (initial load, restart, unvisited level). |
| `loadAnswer(answer, context)` | Resets the task state to `answer`: called on load, restart, `task.reloadAnswer`, level change. |
| `getAnswer()` | The current answer, sent to the platform as stable JSON (keys sorted). |
| `getState()` / `loadState(dump, context)` | `task.getState` / `task.reloadState`. Default: the answer. |
| `onHintsUpdated(hints, context)` | A hint was granted. |
| `onGraded(result, context)` | A grading result arrived (validation, `task.gradeAnswer`, or `{error}`). Changes made here don't clear the result. |
| `showResult` | `false`: the task displays the grading itself (from `onGraded`). |
| `subscribe(listener)` | The task store's `subscribe`: when the answer changes, the result and hint feedback are cleared. |
| `Workspace` | The task UI, remounted on version change. |
| `levels` | `{basic: {version: '1'}, easy: {version: '2', locked: true}, …}`: level tabs, stars, unlocking, reconciled score. |

`context` is `{taskData, hints, version, level, randomSeed}`.

`mountTask(container, options, definition, mountOptions)`: `options` is the page's global
`options` (`defaults.taskID`, `defaults.version`, `server_module.baseUrl`, `language`,
`disableTaskBar`, `workspaceOnly`). `mountOptions`:

| Option | |
|---|---|
| `localServer` | Client mode: the grader module (`taskData`, `gradeAnswer`, `requestHint`, `taskHintData`), run in the page. |
| `levels` | Overrides `definition.levels` (`null`: no levels). |
| `icons` | FontAwesome definitions usable in task HTML as `<fontawesomeicon icon="name">`. |
| `renderIcon` | Custom renderer for task HTML icons. |
| `platform` | Default `window.platform`. |
| `strictMode` | Default: on in development builds. |
| `pageStyles` | Default `true`: page background and container width (`--fioi-container-width`…). |

Client and server builds of the same task:

```ts
if (__TASK_MODE__ === 'client') {
  // Bundled only in client builds.
  return import('../server-modules').then((grader) => mountTask(container, options, task, {localServer: grader}));
}
return mountTask(container, options, task);
```

## 3. The Workspace

Hooks: `useTaskData<T>()`, `useTaskVersion()`, `useHints()`, `useRequestHint()`,
`useHintRequest()`, `useReadOnly()`, `useRandomSeed()`, `useGrading()` (`{grading, loading}`),
`useValidateButton()` (`[status, setStatus]`), `useLevels()`, `useTaskActions()`
(`validate`, `restart`, `clearFeedback`), `useLibTranslation()`.

Components: `Block` (collapsible white section, optional tutorial and close button),
`ContentBlock` (grey section with a green header), `TaskInstructions` (`#instructions` of the page,
filtered by `data-version`), `HtmlContent`, `Tutorial` / `Carousel`, `HintFeedback`, `TaskBar`,
`Modal`, `Button`, `Alert`, `Spinner`, `Stars`, `NumberPicker`, `Collapse`, `Icon`
(`<Icon icon={faCheck} />` with any FontAwesome definition).

The task page's HTML (instructions, tutorials) can use `<fontawesomeicon icon="lock-open"
style="color: #699669"></fontawesomeicon>`; icons other than the built-in ones (check, xmark,
spinner, plus, chevrons, lock, lock-open, note-sticky, thumbtack, circle-question) must be given
in `mountOptions.icons`.

Theme: override the `--fioi-*` custom properties (see `src/styles/_tokens.scss`).

## 4. The page

```html
<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <!-- Bebras integration API (jschannel, platform-pr, installation, miniPlatform…) -->
  <script src="index.js"></script>
</head>
<body>
  <div id="container"></div>
  <div style="display: none">
    <div id="instructions">…</div>
  </div>
  <script>
    var options = {defaults: {taskID: 'my-task', version: 1}, server_module: {baseUrl: 'https://…/'}};
    window.app = runReact(document.getElementById('container'), options);
  </script>
</body>
</html>
```

A classic `<script>`, not `type="module"`: the page must work from `file://`.

## 5. Browser support

Safari 10.1 / iOS 10.3, Chrome 55, Firefox 52, Edge 15 — the `browserslist` of the package. The
build lowers the syntax and `@france-ioi/react-task-lib/polyfills` provides the ES built-ins,
`URL`, `URLSearchParams`, `structuredClone`… What remains for the task author:

- **APIs**: no `ResizeObserver`, `IntersectionObserver`, pointer events, `<dialog>`, `fullscreen`
  without its `webkit` prefix… (`eslint-plugin-compat` with the lib's `browserslist` reports them).
- **CSS**: no flex `gap` (Chrome 84, Safari 14.1), no `inset` (Chrome 87), no `aspect-ratio`, no
  `:where()` / `:is()`, no space-separated color syntax (`rgb(0 0 0 / 50%)`), no `min()` / `max()`
  / `clamp()` (Chrome 79). autoprefixer adds the prefixes.
- **Tailwind**: version 3.4 (v4 needs Safari 16.4 / Chrome 111), with the opacity plugins off so
  that colors compile to hex/`rgba()`:

  ```js
  // tailwind.config.js
  export default {
    content: ['./src/**/*.{ts,tsx}'],
    corePlugins: {
      textOpacity: false, backgroundOpacity: false, borderOpacity: false,
      divideOpacity: false, placeholderOpacity: false, ringOpacity: false,
    },
  };
  ```

  Then don't use `gap-*` on flex containers (use `space-x-*` / `space-y-*`), `inset-*` (use
  `top-0 right-0 bottom-0 left-0`), `grid`, or the `/50` opacity modifiers.
- **Check**: `"check:compat": "fioi-check-compat build/index.js"` (a bin of the lib: the bundle
  must parse as ES2017, without Chrome 55's unsupported trailing commas), and a real Firefox 52
  ESR (see [old-browsers.md](old-browsers.md)).
