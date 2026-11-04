# Protocol tests

Characterization tests of the task ⇄ platform protocol. They were written against v3
(`src/` as of 3.2.17) and must pass unchanged against v4.

- `harness/fakes.ts` — fake `window.platform` (modes `mini` = bebras miniPlatform.js,
  `platform` = real platform owning the token, `manual` = test-driven), fake `window.task_token`,
  fake local grader (`serverTask`), dummy JWT, `callTask()` helper. **No import from `src/`.**
- `harness/types.ts` — the sample task contract every implementation adapter must build.
- `harness/v3.tsx` + `v3_sample_task.tsx` — the sample task on the v3 API.
- `harness/index.ts` — picks the implementation: `TASK_LIB_IMPL=v4 pnpm test` (v4 adapter to add).
- `itV3Bug(...)` — behavior v3 gets wrong: expected to fail on v3, must pass on v4.

Run: `pnpm test` (or `pnpm test:watch`).
