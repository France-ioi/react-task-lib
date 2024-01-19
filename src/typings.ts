import {TypedUseSelectorHook, useSelector} from "react-redux";
import produce from "immer";

export interface HintRequest {
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

export interface TaskPlatformApi {
  getTaskParams: () => Promise<TaskParams>,
  askHint: (hintToken: string) => void,
  validate: () => void,
}

export interface TaskState {
  taskData: any,
  platformApi: TaskPlatformApi,
  serverApi: (service, action, body) => Promise<any>,
  options: any,
  clientVersions: {[level: string]: TaskClientVersion},
  selectors: any,
  randomSeed: string,
  actions: any,
  taskToken: string,
  hintRequest: HintRequest,
  taskMetaData: any,
  grading: any,
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

