import type {PlatformApi, TaskApi, TaskParams} from '../types';

/** Promise-based access to `window.platform`. */
export interface PlatformAdapter {
  initWithTask(task: TaskApi): void;
  getTaskParams(): Promise<TaskParams>;
  askHint(hintToken: string): Promise<unknown>;
  validate(mode: string): Promise<void>;
  updateDisplay(data: {height: number}): Promise<void>;
}

export function createPlatformAdapter(platform: PlatformApi): PlatformAdapter {
  return {
    initWithTask: (task) => platform.initWithTask(task),
    getTaskParams: () => new Promise((resolve, reject) => platform.getTaskParams(null, null, resolve, reject)),
    askHint: (hintToken) => new Promise((resolve, reject) => platform.askHint(hintToken, resolve, reject)),
    validate: (mode) => new Promise((resolve, reject) => platform.validate(mode, resolve, reject)),
    updateDisplay: (data) => new Promise((resolve, reject) => platform.updateDisplay(data, resolve, reject)),
  };
}
