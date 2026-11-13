import type {TaskApi, TaskMetaData} from '../types';

/** What the runtime implements; each handler resolves with the success arguments. */
export interface TaskHandlers {
  load(views: Record<string, boolean>): Promise<void>;
  unload(): Promise<void>;
  updateToken(token: string | null): Promise<void>;
  getHeight(): Promise<number>;
  getMetaData(): Promise<TaskMetaData>;
  getViews(): Promise<Record<string, object>>;
  showViews(views: Record<string, boolean>): Promise<void>;
  getState(): Promise<string>;
  reloadState(state: string): Promise<void>;
  getAnswer(): Promise<string>;
  reloadAnswer(answer: string): Promise<void>;
  gradeAnswer(
    answer: string,
    answerToken: string | null,
    silent: boolean,
  ): Promise<[number, string | undefined, string | undefined]>;
}

/** Marks a handler failure whose error callback was already called (or must not be). */
export class HandledError extends Error {}

type Callback = ((...args: never[]) => void) | undefined;

function settle<T>(promise: Promise<T>, success: Callback, error: Callback, spread: boolean) {
  promise.then(
    (value) => {
      if (!success) return;
      const call = success as (...args: unknown[]) => void;
      if (spread) call(...(value as unknown[]));
      else if (value === undefined) call();
      else call(value);
    },
    (reason: unknown) => {
      if (reason instanceof HandledError) return;
      if (error) (error as (message: unknown) => void)(reason);
      else console.error(reason);
    },
  );
}

/**
 * The `task` object of the Bebras integration API: callback-style methods delegating to the
 * async handlers. Signatures and callback arguments are frozen (see tests/protocol).
 */
export function createTaskApi(handlers: TaskHandlers): TaskApi {
  return {
    load: (views, success, error) => settle(handlers.load(views), success, error, false),
    unload: (success, error) => settle(handlers.unload(), success, error, false),
    updateToken: (token, success, error) => settle(handlers.updateToken(token), success, error, false),
    getHeight: (success, error) => settle(handlers.getHeight(), success, error, false),
    getMetaData: (success, error) => settle(handlers.getMetaData(), success, error, false),
    getViews: (success, error) => settle(handlers.getViews(), success, error, false),
    showViews: (views, success, error) => settle(handlers.showViews(views), success, error, false),
    getState: (success, error) => settle(handlers.getState(), success, error, false),
    reloadState: (state, success, error) => settle(handlers.reloadState(state), success, error, false),
    getAnswer: (success, error) => settle(handlers.getAnswer(), success, error, false),
    reloadAnswer: (answer, success, error) => settle(handlers.reloadAnswer(answer), success, error, false),
    gradeAnswer: (answer, answerToken, success, error, silent = false) =>
      settle(handlers.gradeAnswer(answer, answerToken, silent), success, error, true),
  };
}
