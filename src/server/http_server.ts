import type {GradeRequest, GradingResult, HttpServerConfig, TaskData, TaskServer} from '../types';
import {NetworkError} from '../utils/errors';

const MAX_TRIES = 30;

interface ServerResponse {
  success: boolean;
  error?: unknown;
  data?: {longPolling?: boolean; longPollingFollowUpId?: string; [key: string]: unknown};
}

async function post(url: string, body: unknown): Promise<ServerResponse> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {'Content-Type': 'application/json', Accept: 'application/json'},
      body: JSON.stringify(body),
    });
  } catch (e) {
    throw new NetworkError(e);
  }
  if (response.status !== 200) throw new Error(`Invalid response status: ${response.status}`);
  return (await response.json()) as ServerResponse;
}

/**
 * Generic call: POST `{...body, action}` to `<baseUrl>/<service>`, following long polling
 * (`data.longPolling` → resend with `long_polling_id`). Rejects with `error` when `success` is false.
 */
export function createHttpCall(config: HttpServerConfig) {
  return async function call<T>(service: string, action: string, body: Record<string, unknown>): Promise<T> {
    const url = new URL(service, config.baseUrl).toString();
    const devel = config.devel ? {task: config.devel} : {};
    let longPollingId: string | undefined;
    for (let i = 0; i < MAX_TRIES; i++) {
      const result = await post(url, {
        ...body,
        ...devel,
        action,
        ...(longPollingId ? {long_polling_id: longPollingId} : {}),
      });
      if (result.data?.longPolling) {
        longPollingId = result.data.longPollingFollowUpId;
        continue;
      }
      if (!result.success) throw result.error instanceof Error ? result.error : new Error(String(result.error));
      return result.data as T;
    }
    throw new Error(`No answer from the server after ${MAX_TRIES} long polling requests`);
  };
}

export function createHttpServer(config: HttpServerConfig): TaskServer {
  const call = createHttpCall(config);
  return {
    taskData: (task) => call<TaskData>('tasks', 'taskData', {task}),
    taskHintData: (task) => call<unknown[]>('tasks', 'taskHintData', {task}),
    gradeAnswer: (request: GradeRequest) => call<GradingResult>('tasks', 'gradeAnswer', {...request}),
    requestHint: (task, request) => call<{hintToken: string}>('tasks', 'requestHint', {task, request}),
  };
}
