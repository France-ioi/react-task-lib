# Protocol tests

Tests of the task ⇄ platform protocol (`task.*` called by the platform, `platform.*` called by
the lib), driven only from the outside: platform calls, callback values, rendered text.

They were first written against v3 (3.2.17, tag `v3.2.17`) and run against both implementations
until v4 passed them all; v3 has since been removed. Tests commented "fixed in v4" document
behaviors where v4 deliberately differs from v3 (bugs).

- `harness/fakes.ts` — fake `window.platform` (modes `mini` = bebras miniPlatform.js,
  `platform` = real platform owning the token, `manual` = test-driven), fake `window.task_token`,
  fake local grader (`serverTask`), dummy JWT, `callTask()` helper. No import from `src/`.
- `harness/sample_task.tsx` — the sample task (contract in `harness/types.ts`).
- `harness/mount.tsx` — mounts it in a fresh page; `harness/ui.ts` — access to the lib's UI.

Run: `pnpm test` (or `pnpm test:watch`).
