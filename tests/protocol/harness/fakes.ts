/**
 * Implementation-agnostic fakes used by the protocol (characterization) tests.
 *
 * They reproduce what the real environments do around a task:
 * - FakePlatform: the `window.platform` object. In 'mini' mode it mirrors
 *   bebras-modules/integrationAPI.01/official/miniPlatform.js (local dev / file:// use);
 *   in 'platform' mode it behaves like a real platform that owns the tokens.
 * - FakeTaskToken: the `window.task_token` object created by miniPlatform.
 * - FakeServerTask: a local grader ("server-modules"), used in client mode.
 *
 * Nothing in here may import from src/: these tests must run unchanged against v3 and v4.
 */

/* ---------------------------------------------------------------- dummy JWT */

function encode64(value: string): string {
  return btoa(unescape(encodeURIComponent(value)))
    .replace(/\//g, '_')
    .replace(/\+/g, '-')
    .replace(/=+$/g, '');
}

function decode64(value: string): string {
  return decodeURIComponent(escape(atob(value.replace(/-/g, '+').replace(/_/g, '/'))));
}

export const fakeJwt = {
  sign(data: Record<string, unknown>): string {
    const header = {alg: 'HS256', typ: 'JWT'};
    return `${encode64(JSON.stringify(header))}.${encode64(JSON.stringify({...data, sub: 1234567890}))}.sig`;
  },
  decode(token: string): any {
    return JSON.parse(decode64(token.split('.')[1]!));
  },
};

/* ---------------------------------------------------------- task callbacks */

export interface TaskApi {
  load(views: unknown, success: Function, error: Function): void;
  unload(success: Function, error: Function): void;
  updateToken(token: string, success: Function, error: Function): void;
  getHeight(success: Function, error: Function): void;
  getMetaData(success: Function, error: Function): void;
  getViews(success: Function, error: Function): void;
  showViews(views: unknown, success: Function, error: Function): void;
  getState(success: Function, error: Function): void;
  reloadState(state: string, success: Function, error: Function): void;
  getAnswer(success: Function, error: Function): void;
  reloadAnswer(answer: string, success: Function, error: Function): void;
  gradeAnswer(answer: string, answerToken: string | null, success: Function, error: Function, silent?: boolean): void;
}

export class TaskCallError extends Error {
  constructor(public readonly args: unknown[]) {
    super(`task callback error: ${args.map(a => String(a)).join(', ')}`);
  }
}

/** Call a `task.*` method the way a platform does, and resolve with the arguments of `success`. */
export function callTask(task: TaskApi, method: keyof TaskApi, ...args: unknown[]): Promise<unknown[]> {
  return new Promise((resolve, reject) => {
    const success = (...res: unknown[]) => resolve(res);
    const error = (...res: unknown[]) => reject(new TaskCallError(res));
    if (method === 'gradeAnswer') {
      const [answer, answerToken, silent] = args;
      task.gradeAnswer(answer as string, answerToken as string | null, success, error, silent as boolean | undefined);
    } else {
      (task[method] as Function)(...args, success, error);
    }
  });
}

/* ------------------------------------------------------------- task token */

/** Same semantics as the TaskToken of miniPlatform.js. */
export class FakeTaskToken {
  data: Record<string, unknown>;

  constructor(data: Record<string, unknown>) {
    this.data = {...data, sHintsRequested: '[]'};
  }

  update(newData: Record<string, unknown>) {
    Object.assign(this.data, newData);
  }

  get(callback?: (token: string) => void): string {
    const token = fakeJwt.sign(this.data);
    if (callback) setTimeout(() => callback(token), 0);
    return token;
  }

  getAnswerToken(answer: string, callback?: (token: string) => void): string {
    const token = fakeJwt.sign({...this.data, sAnswer: answer});
    if (callback) setTimeout(() => callback(token), 0);
    return token;
  }

  addHintRequest(hintToken: string, callback?: (token: string) => void): string {
    let hint: unknown = hintToken;
    try {
      hint = fakeJwt.decode(hintToken).askedHint;
    } catch (e) {
      // keep raw value
    }
    const hints = JSON.parse(this.data['sHintsRequested'] as string) as unknown[];
    if (!hints.some(h => JSON.stringify(h) === JSON.stringify(hint))) {
      hints.push(hint);
      this.data['sHintsRequested'] = JSON.stringify(hints);
    }
    return this.get(callback);
  }
}

/* --------------------------------------------------------------- platform */

export interface PlatformCall {
  method: string;
  args: unknown[];
}

export interface FakePlatformOptions {
  /**
   * 'mini': like miniPlatform.js — defines window.task_token, loads the task on initWithTask.
   * 'platform': a real platform — owns the token (given through updateToken), no window.task_token,
   *  loads the task on initWithTask, provides answer tokens to gradeAnswer.
   * 'manual': like 'platform' but nothing happens on initWithTask; the test drives the task.
   */
  mode?: 'mini' | 'platform' | 'manual';
  /** Values returned by getTaskParams. */
  taskParams?: Partial<{randomSeed: string; minScore: number; maxScore: number; noScore: number; options: Record<string, unknown>}>;
  /** Initial token payload in 'platform' mode. */
  tokenPayload?: Record<string, unknown>;
  /** Initial random seed of window.task_token in 'mini' mode. */
  miniRandomSeed?: number;
  views?: Record<string, boolean>;
}

export class FakePlatform {
  calls: PlatformCall[] = [];
  task: TaskApi | null = null;
  metaData: unknown = null;
  /** Last token given to the task through updateToken (platform mode). */
  currentToken: string | null = null;
  readonly loaded: Promise<void>;
  private resolveLoaded!: () => void;
  private rejectLoaded!: (e: unknown) => void;
  readonly options: Required<Pick<FakePlatformOptions, 'mode'>> & FakePlatformOptions;

  constructor(options: FakePlatformOptions = {}) {
    this.options = {mode: 'mini', ...options};
    this.loaded = new Promise((resolve, reject) => {
      this.resolveLoaded = resolve;
      this.rejectLoaded = reject;
    });
    // Avoid unhandled rejections when a test does not await `loaded`.
    this.loaded.catch(() => {});
    if (this.options.mode === 'mini') {
      window.task_token = new FakeTaskToken({
        itemUrl: window.location.href,
        randomSeed: this.options.miniRandomSeed ?? 7,
      });
    }
  }

  callsTo(method: string): unknown[][] {
    return this.calls.filter(c => c.method === method).map(c => c.args);
  }

  private record(method: string, args: unknown[]) {
    this.calls.push({method, args});
  }

  initWithTask(task: TaskApi) {
    this.record('initWithTask', []);
    this.task = task;
    if (this.options.mode === 'manual') return;
    void this.bootstrap(task).then(this.resolveLoaded, this.rejectLoaded);
  }

  /** Sequence performed by miniPlatform.js (and, in substance, by real platforms). */
  private async bootstrap(task: TaskApi) {
    const [metaData] = await callTask(task, 'getMetaData');
    this.metaData = metaData;
    let token: string;
    if (this.options.mode === 'mini') {
      window.task_token.update({id: (metaData as any)?.id});
      token = await new Promise<string>(resolve => window.task_token.get(resolve));
    } else {
      token = fakeJwt.sign(this.options.tokenPayload ?? {});
    }
    this.currentToken = token;
    await callTask(task, 'updateToken', token);
    const views = this.options.views ?? {task: true, solution: true, hints: true, editor: true, grader: true, metadata: true, submission: true};
    await callTask(task, 'load', views);
    await callTask(task, 'getViews');
    await callTask(task, 'showViews', {task: true});
  }

  getTaskParams(key: string | null, defaultValue: unknown, success: (res: unknown) => void, _error?: Function) {
    this.record('getTaskParams', [key, defaultValue]);
    let res: any = {minScore: 0, maxScore: 40, noScore: 0, readOnly: false, randomSeed: '0', options: {}, supportsTabs: true, ...this.options.taskParams};
    if (key) {
      if (key !== 'options' && key in res) res = res[key];
      else if (res.options && key in res.options) res = res.options[key];
      else res = typeof defaultValue !== 'undefined' ? defaultValue : null;
    }
    success(res);
  }

  askHint(hintToken: string, success: (token?: string) => void, error: Function) {
    this.record('askHint', [hintToken]);
    const task = this.task!;
    if (this.options.mode === 'mini') {
      window.task_token.addHintRequest(hintToken, (token: string) => {
        task.updateToken(token, () => {}, () => {});
        success(token);
      });
    } else {
      const payload = this.currentToken ? fakeJwt.decode(this.currentToken) : {};
      const hints = JSON.parse(payload.sHintsRequested ?? '[]');
      hints.push(fakeJwt.decode(hintToken).askedHint);
      const token = fakeJwt.sign({...payload, sHintsRequested: JSON.stringify(hints)});
      this.currentToken = token;
      task.updateToken(token, () => success(token), error);
    }
  }

  validate(mode: string, success?: Function, error?: Function) {
    this.record('validate', [mode]);
    const task = this.task!;
    task.getAnswer((answer: string) => {
      const answerToken = this.options.mode === 'mini'
        ? window.task_token.getAnswerToken(answer)
        : fakeJwt.sign({...(this.currentToken ? fakeJwt.decode(this.currentToken) : {}), sAnswer: answer});
      task.gradeAnswer(answer, answerToken, (score: number, message: string, scoreToken?: string) => {
        this.record('graded', [score, message, scoreToken]);
        success?.();
      }, (message: string) => {
        this.record('gradeError', [message]);
        error?.(message);
      });
    }, () => {});
  }

  updateDisplay(data: unknown, success?: Function) {
    this.record('updateDisplay', [data]);
    success?.();
  }
}

/* ------------------------------------------------------------ local grader */

export interface FakeServerTaskOptions {
  /** Value at which the sample task is solved (score 100). */
  target?: number;
  failTaskData?: string;
  failGrade?: string;
  failRequestHint?: string;
  /** Extra fields of taskData.version, e.g. {hints: false, showScore: false}. */
  versionExtra?: Record<string, unknown>;
}

export interface ServerCall {
  action: string;
  params: any;
}

/**
 * A "server-modules" grader for the sample task: the answer is {value: number},
 * the score is 100 when value >= target, otherwise value * 10.
 * Hints are the list of requested hints (as decoded from the token).
 */
export class FakeServerTask {
  calls: ServerCall[] = [];

  constructor(private readonly options: FakeServerTaskOptions = {}) {}

  callsTo(action: string): any[] {
    return this.calls.filter(c => c.action === action).map(c => c.params);
  }

  taskData(params: any, callback: (error: unknown, result?: unknown) => void) {
    this.calls.push({action: 'taskData', params});
    if (this.options.failTaskData) {
      callback(this.options.failTaskData);
      return;
    }
    callback(null, {
      version: {version: String(params.task.params.version), ...this.options.versionExtra},
      randomSeed: params.task.random_seed,
    });
  }

  gradeAnswer(params: any, taskData: any, callback: (error: unknown, result?: any) => void) {
    this.calls.push({action: 'gradeAnswer', params});
    if (this.options.failGrade) {
      callback(this.options.failGrade);
      return;
    }
    const answer = JSON.parse(params.answer.value);
    const value: number = answer?.value ?? 0;
    const target = this.options.target ?? 3;
    const score = value >= target ? 100 : value * 10;
    callback(null, {score, message: `<b>value=${value}</b> v${taskData.version.version}`});
  }

  requestHint(params: any, callback: (error: unknown, askedHint?: unknown) => void) {
    this.calls.push({action: 'requestHint', params});
    if (this.options.failRequestHint) {
      callback(this.options.failRequestHint);
      return;
    }
    callback(null, params.request);
  }

  taskHintData(params: any, _taskData: any, callback: (error: unknown, result?: unknown) => void) {
    this.calls.push({action: 'taskHintData', params});
    callback(null, JSON.parse(params.task.hints_requested ?? '[]'));
  }
}

declare global {
  interface Window {
    task_token: any;
    platform: any;
    task: any;
    options: any;
  }
}
