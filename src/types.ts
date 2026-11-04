import type {ComponentType} from 'react';

/* ------------------------------------------------------------------ levels */

/** Levels ("versions" with stars) a task can offer, in this order. */
export type LevelName = 'basic' | 'easy' | 'medium' | 'hard';

export interface LevelConfig {
  /** Task version (taskData.version.version) played at this level. */
  version: string;
  /** Locked until the previous level is solved (enforced outside localhost / file:). */
  locked?: boolean;
}

export type LevelsConfig = Partial<Record<LevelName, LevelConfig>>;

export interface LevelState {
  version: string;
  locked: boolean;
  /** Last answer saved for this level (when leaving it). */
  answer: unknown;
  /** Answer that obtained the best score. */
  bestAnswer: unknown;
  /** Best score (0–100) obtained at this level. */
  score: number;
}

/* --------------------------------------------------------------- task data */

export interface TaskVersion {
  version: string;
  /** false: no hints, and the score is not displayed. */
  hints?: boolean;
  /** false: the score is not displayed. */
  showScore?: boolean;
  [key: string]: unknown;
}

/** Data returned by the grader for a task token (`taskData`), at least its version. */
export interface TaskData {
  version: TaskVersion;
  [key: string]: unknown;
}

/** Answered to `task.getMetaData`. */
export interface TaskMetaData {
  id: string;
  language?: string;
  version?: string;
  authors?: string;
  translators?: string[];
  license?: string;
  taskPathPrefix?: string;
  modulesPathPrefix?: string;
  browserSupport?: string[];
  fullFeedback?: boolean;
  acceptedAnswers?: string[];
  usesRandomSeed?: boolean;
  autoHeight?: boolean;
  minWidth?: number | 'auto';
  [key: string]: unknown;
}

/* ----------------------------------------------------------------- options */

export interface HttpServerConfig {
  /** Grader URL; requests are POSTed to `<baseUrl>/tasks`. */
  baseUrl: string;
  /** Development: sent as `task` instead of the token. */
  devel?: unknown;
}

/** The task page options (the global `options` object of index.html). */
export interface TaskOptions {
  defaults?: {
    taskID?: string;
    version?: string | number;
    /** false: don't load hints. */
    hints?: boolean;
  };
  server_module?: HttpServerConfig;
  /** UI language of the lib: 'fr' (default), 'en', 'de', 'es'. */
  language?: string;
  disableTaskBar?: boolean;
  /** Render only the Workspace (no tabs, result, task bar). */
  workspaceOnly?: boolean;
  [key: string]: unknown;
}

/* ----------------------------------------------------------------- grading */

export interface GradingResult {
  score?: number;
  /** HTML message from the grader. */
  message?: string;
  /** Grading error (displayed instead of the result). */
  error?: string;
  token?: string;
  scoreToken?: string;
  [key: string]: unknown;
}

export const ValidateButtonStatus = {
  Enabled: 'enabled',
  Disabled: 'disabled',
  Hidden: 'hidden',
} as const;
export type ValidateButtonStatus = (typeof ValidateButtonStatus)[keyof typeof ValidateButtonStatus];

export interface HintRequestState {
  /** Incremented on each request. */
  reqID: number;
  isActive: boolean;
  data: null | {success: true} | {success: false; code: number; error: string};
}

/* ---------------------------------------------------------- task definition */

export interface TaskContext<TData extends TaskData = TaskData, Hint = unknown> {
  taskData: TData;
  hints: Hint[];
  /** taskData.version.version */
  version: string;
  /** Current level, when the task has levels. */
  level: LevelName | null;
  /** Random seed of the task (without the level suffix). */
  randomSeed: string;
}

/**
 * What a task provides to the lib. The task owns its state (any store; Zustand recommended):
 * the lib only reads and writes it through these functions.
 */
export interface TaskDefinition<Answer = unknown, TData extends TaskData = TaskData, Hint = unknown, Dump = Answer> {
  metaData: TaskMetaData;
  /** The answer of a fresh task (initial load, restart, unvisited level). */
  defaultAnswer(taskData: TData): Answer;
  /** Reset the task state to this answer. */
  loadAnswer(answer: Answer, context: TaskContext<TData, Hint>): void;
  /** The current answer (sent to the platform as stable JSON). */
  getAnswer(): Answer;
  /** State dump for task.getState (default: the answer). */
  getState?(): Dump;
  /** Restore a dump from task.reloadState (default: loadAnswer). */
  loadState?(dump: Dump, context: TaskContext<TData, Hint>): void;
  /** Hints changed after a successful hint request. */
  onHintsUpdated?(hints: Hint[], context: TaskContext<TData, Hint>): void;
  /**
   * Notify the lib of state changes: when the answer changes, the grading and hint feedback are
   * cleared. Pass the task store's subscribe (e.g. `useTaskStore.subscribe`). Without it, call
   * `clearFeedback()` (useTaskActions) yourself.
   */
  subscribe?(listener: () => void): () => void;
  /** The task UI. Remounted on version change. */
  Workspace: ComponentType;
  /** Levels offered by the task (can be overridden by mountTask). */
  levels?: LevelsConfig;
}

/* ----------------------------------------------------------------- protocol */

type Success<T extends unknown[] = []> = (...args: T) => void;
type Failure = (message?: unknown) => void;

/** The `task` object given to `platform.initWithTask` (Bebras integration API). */
export interface TaskApi {
  load(views: Record<string, boolean>, success: Success, error: Failure): void;
  unload(success: Success, error: Failure): void;
  updateToken(token: string | null, success: Success, error: Failure): void;
  getHeight(success: Success<[number]>, error: Failure): void;
  getMetaData(success: Success<[TaskMetaData]>, error: Failure): void;
  getViews(success: Success<[Record<string, object>]>, error: Failure): void;
  showViews(views: Record<string, boolean>, success: Success, error: Failure): void;
  getState(success: Success<[string]>, error: Failure): void;
  reloadState(state: string, success: Success, error: Failure): void;
  getAnswer(success: Success<[string]>, error: Failure): void;
  reloadAnswer(answer: string, success: Success, error: Failure): void;
  gradeAnswer(
    answer: string,
    answerToken: string | null,
    success: Success<[number, string | undefined, string | undefined]>,
    error: Failure | undefined,
    silent?: boolean,
  ): void;
}

export interface TaskParams {
  randomSeed: string | number;
  minScore: number;
  maxScore: number;
  noScore: number;
  options?: {version?: string; [key: string]: unknown};
  [key: string]: unknown;
}

/** `window.platform` (Bebras integration API: miniPlatform.js, platform-pr.js…). */
export interface PlatformApi {
  initWithTask(task: TaskApi): void;
  getTaskParams(
    key: string | null | undefined,
    defaultValue: unknown,
    success: (params: TaskParams) => void,
    error?: Failure,
  ): void;
  askHint(hintToken: string, success: (token?: string) => void, error?: Failure): void;
  validate(mode: string, success?: () => void, error?: Failure): void;
  updateDisplay(data: {height?: number; [key: string]: unknown}, success?: () => void, error?: Failure): void;
  debug?: boolean;
}

/* -------------------------------------------------------------------- server */

/** Decoded task token, as given to the local grader. */
export interface DecodedTask {
  task_id: string;
  random_seed: unknown;
  hints_requested: unknown;
  params: Record<string, string>;
  payload: Record<string, unknown>;
}

type NodeCallback<T> = (error: unknown, result?: T) => void;

/** A local grader ("server-modules"), used in client mode. */
export interface ServerTask {
  taskData(params: {task: DecodedTask; [key: string]: unknown}, callback: NodeCallback<unknown>): void;
  gradeAnswer(
    params: {task: DecodedTask; answer: DecodedTask & {value: unknown}; [key: string]: unknown},
    taskData: unknown,
    callback: NodeCallback<GradingResult>,
  ): void;
  requestHint(
    params: {task: DecodedTask; request: unknown; [key: string]: unknown},
    callback: NodeCallback<unknown>,
  ): void;
  taskHintData(
    params: {task: DecodedTask; [key: string]: unknown},
    taskData: unknown,
    callback: NodeCallback<unknown>,
  ): void;
}

export interface GradeRequest {
  task: string;
  answer: string;
  min_score: number;
  max_score: number;
  no_score: number;
}

/** What the lib needs from a grader, remote (HTTP) or local. */
export interface TaskServer {
  taskData(taskToken: string): Promise<TaskData>;
  taskHintData(taskToken: string): Promise<unknown[]>;
  gradeAnswer(request: GradeRequest): Promise<GradingResult>;
  requestHint(taskToken: string, request: unknown): Promise<{hintToken: string}>;
}
