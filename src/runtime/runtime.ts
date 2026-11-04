import {createTranslator, type Translate} from '../i18n';
import {createIconRenderer, type IconDefinition, type RenderIcon} from '../ui/icons';
import {
  findLevelByVersion,
  firstImprovableVersion,
  initLevels,
  levelNames,
  reconciledScore,
  withLevelAnswer,
  withLevelScore,
  type Levels,
} from '../levels';
import {bebrasWindow} from '../globals';
import type {PlatformAdapter} from '../platform/platform_adapter';
import {createTaskApi, type TaskHandlers} from '../platform/task_api';
import {jwt} from '../token/jwt';
import {generateTokenUrl, getQueryParams} from '../token/url';
import {answerTokenForVersion, taskTokenForVersion, type VersionTokenParams} from '../token/version_token';
import {
  ValidateButtonStatus,
  type GradingResult,
  type LevelName,
  type LevelsConfig,
  type TaskApi,
  type TaskContext,
  type TaskData,
  type TaskDefinition,
  type TaskOptions,
  type TaskServer,
} from '../types';
import {errorMessage, isNetworkError} from '../utils/errors';
import {stableStringify} from '../utils/stable_stringify';
import {createLibStore, initialHintRequest, type LibState, type LibStore} from './store';

const HEIGHT_POLL_MS = 200;

/** Steps of a hint request, reported as `code` when it fails. */
const HINT_STEP = {
  activated: 10,
  requestedToServer: 20,
  askedToPlatform: 30,
  tokenUpdated: 40,
  hintDataRequested: 50,
  done: 60,
} as const;

/**
 * A definition with any answer/data/hint/dump types: the runtime only passes values between the
 * task's own functions (`any` because those parameters are contravariant).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyTaskDefinition = TaskDefinition<any, any, any, any>;

export interface RuntimeConfig {
  definition: AnyTaskDefinition;
  /** Extra icons available by name in task HTML (`<fontawesomeicon icon="…">`). */
  icons?: IconDefinition[];
  /** Custom renderer for task HTML icons, tried first (null: fall back to the known icons). */
  renderIcon?: RenderIcon;
  options: TaskOptions;
  platform: PlatformAdapter;
  server: TaskServer;
  levels?: LevelsConfig | null;
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Implements the task side of the platform protocol and the lib features (levels, hints,
 * grading display, validation). One instance per mounted task.
 */
export class TaskRuntime {
  readonly store: LibStore;
  readonly taskApi: TaskApi;
  readonly t: Translate;
  readonly renderIcon: RenderIcon;
  private readonly definition: AnyTaskDefinition;
  private readonly platform: PlatformAdapter;
  private readonly server: TaskServer;
  private heightMonitor: ReturnType<typeof setTimeout> | null = null;
  private lastHeight: number | null = null;
  private disposed = false;
  /** Answer JSON after the lib's last write to the task: changes from there are user changes. */
  private answerBaseline: string | undefined;
  private writingTask = false;
  private unsubscribeTask: (() => void) | null = null;

  constructor({definition, options, platform, server, levels, icons, renderIcon}: RuntimeConfig) {
    this.definition = definition;
    const knownIcons = createIconRenderer(icons);
    this.renderIcon = renderIcon ? (name, style) => renderIcon(name, style) ?? knownIcons(name, style) : knownIcons;
    this.platform = platform;
    this.server = server;
    const language = options.language ?? 'fr';
    this.t = createTranslator(language);
    this.store = createLibStore(options, language, initLevels(levels === undefined ? definition.levels : levels));
    this.taskApi = createTaskApi(this.handlers());
    if (definition.subscribe) {
      this.unsubscribeTask = definition.subscribe(() => this.onTaskChanged());
    }
  }

  get state(): LibState {
    return this.store.getState();
  }

  private set(partial: Partial<LibState> | ((state: LibState) => Partial<LibState>)) {
    this.store.setState(partial);
  }

  /** Exposes `window.task` and hands the task to the platform. */
  start() {
    bebrasWindow().task = this.taskApi;
    this.platform.initWithTask(this.taskApi);
  }

  dispose() {
    this.disposed = true;
    if (this.heightMonitor) clearTimeout(this.heightMonitor);
    this.unsubscribeTask?.();
  }

  /* ------------------------------------------------------------ task access */

  context(): TaskContext {
    const {taskData, taskHints, levels, randomSeed} = this.state;
    const version = taskData!.version.version;
    return {
      taskData: taskData!,
      hints: taskHints,
      version,
      level: levels ? findLevelByVersion(levels, version) : null,
      randomSeed,
    };
  }

  /** Calls the task without treating its state changes as user changes. */
  private writeTask(write: () => void) {
    this.writingTask = true;
    try {
      write();
    } finally {
      this.writingTask = false;
      this.answerBaseline = this.currentAnswerJson();
    }
  }

  private currentAnswerJson(): string | undefined {
    if (!this.state.taskReady) return undefined;
    try {
      return stableStringify(this.definition.getAnswer());
    } catch {
      return undefined;
    }
  }

  private onTaskChanged() {
    if (this.writingTask || !this.state.taskReady) return;
    const json = this.currentAnswerJson();
    if (json !== this.answerBaseline) {
      this.answerBaseline = json;
      this.clearFeedback();
    }
  }

  private loadAnswerIntoTask(answer: unknown) {
    const context = this.context();
    const value = answer === null || answer === undefined ? this.definition.defaultAnswer(context.taskData) : answer;
    this.writeTask(() => this.definition.loadAnswer(value, context));
  }

  /** Fresh start on taskData: default answer, validate button enabled, hint feedback reset. */
  private initTask(taskData: TaskData, taskHints: unknown[]) {
    this.set({
      taskData,
      taskHints,
      validateButtonStatus: ValidateButtonStatus.Enabled,
      hintRequest: initialHintRequest(),
    });
    this.loadAnswerIntoTask(null);
    this.set({taskReady: true});
    this.answerBaseline = this.currentAnswerJson();
  }

  /* -------------------------------------------------------------- feedback */

  /** Clears the grading result and the hint request feedback. */
  clearFeedback() {
    const {hintRequest, grading} = this.state;
    if (hintRequest.isActive || hintRequest.data !== null) {
      this.set({hintRequest: {...hintRequest, data: null, isActive: false}});
    }
    if (Object.keys(grading).length || this.state.gradingLoading) {
      this.set({grading: {}, gradingLoading: false});
    }
  }

  setValidateButtonStatus(status: ValidateButtonStatus) {
    this.set({validateButtonStatus: status});
  }

  /* ---------------------------------------------------------------- tokens */

  private tokenParams(version: string, randomSeed = this.state.randomSeed): VersionTokenParams {
    return {version, randomSeed, levels: this.state.levels, defaultTaskID: this.state.options.defaults?.taskID};
  }

  private hintsEnabled(): boolean {
    return this.state.options.defaults?.hints !== false;
  }

  private async fetchTaskData(taskToken: string): Promise<{taskData: TaskData; taskHints: unknown[]}> {
    const taskData = await this.server.taskData(taskToken);
    const taskHints = this.hintsEnabled() ? await this.server.taskHintData(taskToken) : [];
    return {taskData, taskHints};
  }

  /* ------------------------------------------------------------------ load */

  private async load(): Promise<void> {
    const params = await this.platform.getTaskParams();
    const query = getQueryParams();
    let {randomSeed} = params;
    const {options: platformOptions} = params;

    // The token may have been given (task.updateToken) before task.load.
    let taskToken = this.state.taskToken;
    const tokenGivenBeforeLoad = !!taskToken;
    if (!taskToken) taskToken = query['sToken'] ?? bebrasWindow().task_token?.get() ?? null;

    let payload: Record<string, unknown> = {};
    try {
      payload = jwt.decode(taskToken!);
    } catch (e) {
      console.error(e);
    }

    // Large random seeds overflow integers: always handled as strings.
    randomSeed = String(randomSeed);
    if (randomSeed === '0') {
      randomSeed = String(query['randomSeed'] ?? Math.floor(Math.random() * 10));
      if (payload['randomSeed'] !== null && payload['randomSeed'] !== undefined)
        randomSeed = String(payload['randomSeed']);
    }
    this.set({randomSeed});

    if (payload['bSubmissionPossible'] === false) this.set({readOnly: true});

    const {levels, options} = this.state;
    let version: string;
    if (levels) {
      version = levels[levelNames(levels)[0]!]!.version;
    } else if (platformOptions?.version) {
      version = String(platformOptions.version);
    } else if (query['version']) {
      version = query['version'];
    } else {
      // No version: reload the page with the default one (the load never answers).
      window.location.href = generateTokenUrl({
        ...query,
        taskID: query['taskID'] ?? options.defaults?.taskID,
        version: options.defaults?.version,
      });
      return new Promise<void>(() => {});
    }

    if (!tokenGivenBeforeLoad || levels) {
      taskToken = taskTokenForVersion(this.tokenParams(version, randomSeed));
      this.set({taskToken});
    }

    try {
      const {taskData, taskHints} = await this.fetchTaskData(taskToken!);
      this.initTask(taskData, taskHints);
    } catch (e) {
      throw e instanceof Error ? e.message : e;
    }
    this.startHeightMonitor();
  }

  private startHeightMonitor() {
    if (this.heightMonitor) return;
    const tick = async () => {
      if (this.disposed) return;
      const height = getHeight();
      if (height !== this.lastHeight) {
        this.lastHeight = height;
        try {
          await this.platform.updateDisplay({height});
        } catch (e) {
          console.error(e);
        }
      }
      this.heightMonitor = setTimeout(tick, HEIGHT_POLL_MS);
    };
    this.heightMonitor = setTimeout(tick, HEIGHT_POLL_MS);
  }

  /* --------------------------------------------------------------- answers */

  /** All levels answers ({level: answer}) or the current answer. */
  private aggregatedAnswer(): unknown {
    const current = this.definition.getAnswer();
    const {levels, taskData} = this.state;
    if (!levels || !taskData) return current;
    const currentVersion = taskData!.version.version;
    const answers: Record<string, unknown> = {};
    for (const name of levelNames(levels)) {
      const level = levels[name]!;
      answers[name] = level.version === currentVersion ? current : level.answer;
    }
    return answers;
  }

  private saveLevelAnswer(answer: unknown, version = this.state.taskData!.version.version) {
    const {levels} = this.state;
    if (levels) this.set({levels: withLevelAnswer(levels, version, answer)});
  }

  private async reloadAnswer(answer: string): Promise<void> {
    if (!answer) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(answer);
    } catch (e) {
      throw `bad answer: ${errorMessage(e)}`;
    }
    const {levels} = this.state;
    if (!levels) {
      this.loadAnswerIntoTask(parsed);
      return;
    }
    const answers = (parsed ?? {}) as Record<string, unknown>;
    const currentVersion = this.state.taskData!.version.version;
    for (const name of levelNames(levels)) {
      const {version} = levels[name]!;
      this.saveLevelAnswer(answers[name] ?? null, version);
      if (version === currentVersion) this.loadAnswerIntoTask(answers[name] ?? null);
    }
    // Restores the level scores (and unlocks), then opens the first level that can improve.
    await this.grade(answer, null, true);
    const nextVersion = firstImprovableVersion(this.state.levels!);
    if (nextVersion !== null) await this.changeVersion(nextVersion, false);
  }

  /* --------------------------------------------------------------- grading */

  private async grade(
    answerJson: string,
    answerToken: string | null,
    silent: boolean,
  ): Promise<[number, string | undefined, string | undefined]> {
    try {
      // Read the answer from the argument: gradeAnswer can be called without reloadAnswer first
      // (bebras-platform teacherInterface/gradeContest.js).
      const answer = JSON.parse(answerJson) as unknown;
      // The random seed comes from the platform when it re-grades answers in a teacher's browser.
      const params = await this.platform.getTaskParams();
      const {minScore, maxScore, noScore} = params;
      let randomSeed = String(params.randomSeed);
      // miniPlatform always says "0": the seed is the lib's (without level suffix).
      if (randomSeed === '0') randomSeed = this.state.randomSeed;
      const bounds = {min_score: minScore, max_score: maxScore, no_score: noScore};

      const {levels, taskData, taskToken} = this.state;
      if (levels) {
        const answers = (answer ?? {}) as Record<string, unknown>;
        const scores: Partial<Record<LevelName, number>> = {};
        let current: GradingResult | null = null;
        for (const name of levelNames(levels)) {
          const level = this.state.levels![name]!;
          if (!answers[name]) {
            scores[name] = 0;
            continue;
          }
          // Each level is graded with its own token, and an answer token holding only its answer.
          const params = this.tokenParams(level.version, randomSeed);
          const result = await this.server.gradeAnswer({
            task: taskTokenForVersion(params),
            answer: answerTokenForVersion(stableStringify(answers[name])!, params),
            ...bounds,
          });
          scores[name] = result.score ?? 0;
          if (level.version === taskData!.version.version) current = result;
          this.set({levels: withLevelScore(this.state.levels!, level.version, result.score ?? 0, answers[name])});
        }
        if (!silent) {
          const solvedNow = current?.score === 100 && this.state.grading.score !== 100;
          this.showGrading(current ?? {}, solvedNow ? {upgradeProposal: this.nextLevel()} : {});
        }
        return [reconciledScore(scores), current?.message, current?.['scoreToken'] as string | undefined];
      }

      const token = answerToken || bebrasWindow().task_token?.getAnswerToken(stableStringify(answer)!) || '';
      const result = await this.server.gradeAnswer({task: taskToken!, answer: token, ...bounds});
      this.showGrading(result);
      return [result.score ?? 0, result.message, result.token];
    } catch (e) {
      const message = isNetworkError(e) ? this.t('error.no_internet') : errorMessage(e);
      this.showGrading({error: message});
      console.error(e);
      throw message;
    }
  }

  /** Displays a grading result and tells the task (onGraded). */
  private showGrading(grading: GradingResult, extra: Partial<LibState> = {}) {
    this.set({grading, ...extra});
    if (this.definition.onGraded && this.state.taskData) {
      const context = this.context();
      try {
        this.writeTask(() => this.definition.onGraded!(grading, context));
      } catch (e) {
        console.error('onGraded failed', e);
      }
    }
  }

  /** Task bar "validate": the platform grades through task.getAnswer / task.gradeAnswer. */
  async validate(mode = 'done') {
    this.set({gradingLoading: true});
    await sleep(0);
    try {
      await this.platform.validate(mode);
    } catch (e) {
      console.error('An error happened during platform.validate', e);
    } finally {
      this.set({gradingLoading: false});
    }
  }

  /* -------------------------------------------------------------- versions */

  private async loadVersion() {
    const {taskData, taskHints} = await this.fetchTaskData(this.state.taskToken!);
    const {levels} = this.state;
    const saved = levels ? levels[findLevelByVersion(levels, taskData.version.version)!]?.answer : null;
    if (saved !== null && saved !== undefined) {
      this.set({taskData, taskHints});
      this.loadAnswerIntoTask(saved);
    } else {
      this.initTask(taskData, taskHints);
    }
    this.set({
      hintRequest: {...this.state.hintRequest, data: null, isActive: false},
      grading: {},
      gradingLoading: false,
    });
  }

  /** Starts the current version (level) over from its default answer. */
  async restart() {
    this.saveLevelAnswer(null);
    await this.loadVersion();
  }

  /** Switches level: saves the current answer, grades all levels silently, loads the version. */
  async changeVersion(version: string, scroll: boolean) {
    this.saveLevelAnswer(this.definition.getAnswer());
    try {
      await this.grade(stableStringify(this.aggregatedAnswer())!, null, true);
    } catch {
      // Silent grading: errors are not reported to the user here.
    }
    this.set({taskToken: taskTokenForVersion(this.tokenParams(version))});
    await this.loadVersion();
    if (scroll) {
      await sleep(100);
      window.scrollTo({top: 0, behavior: 'smooth'});
    }
  }

  /** The level after the current one, if any. */
  private nextLevel(): LevelName | null {
    const {levels, taskData} = this.state;
    if (!levels || !taskData) return null;
    const names = levelNames(levels);
    return names[names.indexOf(findLevelByVersion(levels, taskData.version.version)!) + 1] ?? null;
  }

  dismissUpgradeProposal() {
    this.set({upgradeProposal: null});
  }

  /** Level tab click: refused (false) when locked, except on localhost / file:. */
  canOpenLevel(level: LevelName): boolean {
    const {levels} = this.state;
    if (!levels?.[level]?.locked) return true;
    const {protocol, hostname} = window.location;
    return protocol === 'file:' || ['localhost', '127.0.0.1', '0.0.0.0'].indexOf(hostname) !== -1;
  }

  /* ----------------------------------------------------------------- hints */

  async requestHint(request: unknown) {
    let code: number = HINT_STEP.activated;
    try {
      const {hintRequest, levels, taskData, taskToken} = this.state;
      this.set({hintRequest: {reqID: hintRequest.reqID + 1, data: null, isActive: true}});
      code = HINT_STEP.requestedToServer;
      const token = levels ? taskTokenForVersion(this.tokenParams(taskData!.version.version)) : taskToken!;
      const {hintToken} = await this.server.requestHint(token, request);
      code = HINT_STEP.askedToPlatform;
      // The platform grants the hint and gives an updated token through task.updateToken.
      await this.platform.askHint(hintToken);
      code = HINT_STEP.tokenUpdated;
      const updatedToken = this.state.taskToken!;
      code = HINT_STEP.hintDataRequested;
      const taskHints = await this.server.taskHintData(updatedToken);
      code = HINT_STEP.done;
      this.set({taskHints: JSON.parse(JSON.stringify(taskHints)) as unknown[]});
      const context = this.context();
      this.writeTask(() => this.definition.onHintsUpdated?.(context.hints, context));
      this.set({hintRequest: {...this.state.hintRequest, data: {success: true}, isActive: false}});
    } catch (e) {
      console.error(e);
      const error = isNetworkError(e) ? this.t('error.no_internet') : errorMessage(e);
      this.set({hintRequest: {...this.state.hintRequest, data: {success: false, code, error}, isActive: false}});
    }
  }

  /* --------------------------------------------------------------- handlers */

  private handlers(): TaskHandlers {
    return {
      load: () => this.load(),
      unload: async () => {},
      updateToken: async (token) => {
        if (token === null) {
          console.warn('ignored task.updateToken with null token');
          return;
        }
        this.set({taskToken: token});
      },
      getHeight: async () => getHeight(),
      getMetaData: async () => this.definition.metaData,
      getViews: async () => ({task: {}}),
      showViews: async (views) => this.set({taskViews: views}),
      getState: async () => {
        const dump = this.definition.getState ? this.definition.getState() : this.definition.getAnswer();
        return stableStringify(dump)!;
      },
      reloadState: async (state) => {
        if (!state) return;
        let dump: unknown;
        try {
          dump = JSON.parse(state);
        } catch (e) {
          throw `bad state: ${errorMessage(e)}`;
        }
        const context = this.context();
        this.writeTask(() =>
          this.definition.loadState
            ? this.definition.loadState(dump, context)
            : this.definition.loadAnswer(dump, context),
        );
      },
      getAnswer: async () => stableStringify(this.aggregatedAnswer())!,
      reloadAnswer: (answer) => this.reloadAnswer(answer),
      gradeAnswer: (answer, answerToken, silent) => this.grade(answer, answerToken, silent),
    };
  }
}

export function getHeight(): number {
  return Math.max(document.body.offsetHeight, document.documentElement.offsetHeight);
}

export type {Levels};
