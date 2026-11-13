import {createStore} from 'zustand/vanilla';
import type {Levels} from '../levels';
import type {LevelName} from '../types';
import {
  ValidateButtonStatus,
  type GradingResult,
  type HintRequestState,
  type TaskData,
  type TaskOptions,
} from '../types';

/** State owned by the lib (the task keeps its own state). */
export interface LibState {
  options: TaskOptions;
  language: string;
  fatalError: string | null;
  /** The task has been initialised with its first taskData (Workspace can render). */
  taskReady: boolean;
  taskToken: string | null;
  /** Random seed without the level suffix. */
  randomSeed: string;
  readOnly: boolean;
  taskData: TaskData | null;
  taskHints: unknown[];
  levels: Levels | null;
  /** Next level proposed after solving the current one (modal), or null. */
  upgradeProposal: LevelName | null;
  /** Result of the last (non-silent) grading; `{}` when none. */
  grading: GradingResult;
  gradingLoading: boolean;
  validateButtonStatus: ValidateButtonStatus;
  hintRequest: HintRequestState;
  /** Views requested by the platform (task.showViews). */
  taskViews: Record<string, boolean>;
}

export const initialHintRequest = (): HintRequestState => ({reqID: 0, isActive: false, data: null});

export function createLibStore(options: TaskOptions, language: string, levels: Levels | null) {
  return createStore<LibState>()(() => ({
    options,
    language,
    fatalError: null,
    taskReady: false,
    taskToken: null,
    randomSeed: '0',
    readOnly: false,
    taskData: null,
    taskHints: [],
    levels,
    upgradeProposal: null,
    grading: {},
    gradingLoading: false,
    validateButtonStatus: ValidateButtonStatus.Enabled,
    hintRequest: initialHintRequest(),
    taskViews: {},
  }));
}

export type LibStore = ReturnType<typeof createLibStore>;
