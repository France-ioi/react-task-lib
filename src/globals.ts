import type {PlatformApi, TaskApi} from './types';
import type {TaskTokenLike} from './token/task_token';

/** Globals of the Bebras integration API (not declared on Window to keep the lib types clean). */
export interface BebrasWindow {
  platform?: PlatformApi;
  task?: TaskApi;
  /** Defined by miniPlatform.js. */
  task_token?: TaskTokenLike;
}

export const bebrasWindow = (): BebrasWindow => window as unknown as BebrasWindow;
