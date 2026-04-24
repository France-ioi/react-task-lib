import {TypedUseSelectorHook, useSelector} from "react-redux";
import {produce} from "immer";

export interface HintRequest {
  /**
   * To clear the hint feedback after a timeout, we read the ID, wait for a few
   * seconds, read the ID again and check it match.
   */
  reqID: number,
  isActive: boolean,
  data?: {
    success: boolean,
    code?: string,
    error?: string,
  },
}

export interface TaskClientVersion {
  version: string,
  answer: any,
  bestAnswer: any,
  locked: boolean,
  score: number,
}

export interface TaskParams {
  randomSeed: string,
  minScore: number,
  maxScore: number,
  noScore: number,
  options: any,
}

export interface TaskGradeAnswerArgs {
  /** JSON representation of the answer (probably the one returned by task.getAnswer). */
  answer: string,
  /** Token containing the answer (field sAnswer), as well as idUser and idItem and score. */
  answerToken: string,
  /** The score must be between minScore and maxScore. */
  success: (score: number, message: string, scoreToken?: string) => void,
  error: (message: string) => void,
  silent: boolean,
}

export interface TaskPlatformApi {
  getTaskParams: () => Promise<TaskParams>,
  askHint: (hintToken: string) => void,
  validate: () => void,
}

export interface TaskOptions {
  disableTaskBar?: boolean,
  workspaceOnly?: boolean,
  defaults?: {
    taskID: string,
    version: string,
    hints: boolean,
  }
  server_module?: {
    baseUrl: string,
  },
}

export interface TaskState {
  taskData: any,
  taskHints: any[],
  platformApi: TaskPlatformApi,
  serverApi: (service, action, body) => Promise<any>,
  options: TaskOptions,
  clientVersions: {[level: string]: TaskClientVersion},
  selectors: any,
  randomSeed: string,
  readOnly?: boolean,
  actions: any,
  taskToken: string,
  hintRequest: HintRequest,
  taskMetaData: any,
  grading: any,
  gradingLoading: boolean,
  hints: any,
  answer: any,
  taskViews: any,
  views: { [key: string]: any },
  fatalError?: string,
  taskReady: boolean,
}

export const useAppSelector: TypedUseSelectorHook<TaskState> = useSelector;

export const reducer = (reduce: (state: TaskState, action: any) => void) => (state, action) =>
  produce<TaskState>(state, (draft) => reduce(draft, action));

declare global {
  interface Window {
    task_token: any,
    options: any,
    jwt: any,
    platform: any,
    task: any,
    __REDUX_DEVTOOLS_EXTENSION_COMPOSE__: any,
  }
}

