import {useCallback} from 'react';
import type {Levels} from '../levels';
import type {GradingResult, HintRequestState, LevelName, TaskData, TaskVersion, ValidateButtonStatus} from '../types';
import {findLevelByVersion} from '../levels';
import {useLibState, useRuntime} from './context';

/** taskData of the current version (the Workspace only renders once it is loaded). */
export function useTaskData<TData extends TaskData = TaskData>(): TData {
  const taskData = useLibState((state) => state.taskData);
  if (!taskData) throw new Error('useTaskData: the task is not loaded yet');
  return taskData as TData;
}

export function useTaskVersion(): TaskVersion {
  return useTaskData().version;
}

/** Hints granted so far (taskHintData). */
export function useHints<Hint = unknown>(): Hint[] {
  return useLibState((state) => state.taskHints) as Hint[];
}

/** Requests a hint: the grader issues a hint token, the platform grants it, hints are reloaded. */
export function useRequestHint<Request = unknown>(): (request: Request) => Promise<void> {
  const runtime = useRuntime();
  return useCallback((request: Request) => runtime.requestHint(request), [runtime]);
}

export function useHintRequest(): HintRequestState {
  return useLibState((state) => state.hintRequest);
}

export function useReadOnly(): boolean {
  return useLibState((state) => state.readOnly);
}

export function useRandomSeed(): string {
  return useLibState((state) => state.randomSeed);
}

export function useGrading(): {grading: GradingResult; loading: boolean} {
  const grading = useLibState((state) => state.grading);
  const loading = useLibState((state) => state.gradingLoading);
  return {grading, loading};
}

/** Status of the task bar validate button, and its setter. */
export function useValidateButton(): [ValidateButtonStatus, (status: ValidateButtonStatus) => void] {
  const runtime = useRuntime();
  const status = useLibState((state) => state.validateButtonStatus);
  const setStatus = useCallback((value: ValidateButtonStatus) => runtime.setValidateButtonStatus(value), [runtime]);
  return [status, setStatus];
}

export interface LevelsInfo {
  levels: Levels;
  current: LevelName | null;
}

/** Levels of the task (null without levels) and the current one. */
export function useLevels(): LevelsInfo | null {
  const levels = useLibState((state) => state.levels);
  const version = useLibState((state) => state.taskData?.version.version);
  if (!levels) return null;
  return {levels, current: version ? findLevelByVersion(levels, version) : null};
}

/** Actions a task can trigger. */
export function useTaskActions() {
  const runtime = useRuntime();
  return {
    /** Clears grading and hint feedback (automatic when the task gives `subscribe`). */
    clearFeedback: useCallback(() => runtime.clearFeedback(), [runtime]),
    validate: useCallback((mode?: string) => runtime.validate(mode), [runtime]),
    restart: useCallback(() => runtime.restart(), [runtime]),
  };
}
