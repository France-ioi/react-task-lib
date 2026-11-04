import type {FakePlatform, FakePlatformOptions, FakeServerTask, FakeServerTaskOptions, TaskApi} from './fakes';

export interface LevelSpec {
  version: string;
  locked?: boolean;
}

/**
 * Describes one mount of the sample task (see sample_task.tsx):
 *
 * - answer: `{value: number}`, initial value 0;
 * - task state dump (getState): `{value: number}`;
 * - metaData: {@link SAMPLE_META_DATA};
 * - Workspace UI (impl-agnostic contract used by the tests):
 *   - `[data-testid=value]` current value, `[data-testid=version]` current version,
 *     `[data-testid=hints]` JSON of the current task hints, `[data-testid=readonly]` "yes"/"no";
 *   - button "increment": user action that changes the answer (and clears feedback);
 *   - button "hint A": requests the hint `{hint: 'A'}`;
 *   - buttons "validate enabled" / "validate disabled" / "validate hidden": set the validate
 *     button status;
 *   - the hint request feedback.
 *   - the instructions (`#instructions`) through the lib's instructions component.
 */
export interface MountSpec {
  /** Query string of the task page. Default: '?taskID=sample&version=1'. */
  query?: string;
  /** Options passed to the task's entry point (the global `options` of index.html). */
  options?: Record<string, any>;
  /** Client versions (levels). */
  levels?: Record<string, LevelSpec>;
  platform?: FakePlatformOptions;
  server?: FakeServerTaskOptions;
  /** Use the local grader (client mode). Default true. When false, options.server_module is used. */
  local?: boolean;
}

export interface Mounted {
  platform: FakePlatform;
  server: FakeServerTask;
  /** The `task` object given to platform.initWithTask. */
  readonly task: TaskApi;
  container: HTMLElement;
}

export const SAMPLE_META_DATA = {
  id: 'http://example.org/tasks/sample',
  language: 'fr',
  version: 'fr.01',
  fullFeedback: true,
  usesRandomSeed: true,
  autoHeight: true,
};

export type MountFn = (spec?: MountSpec) => Promise<Mounted>;
