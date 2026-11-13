import {jwt} from '../token/jwt';
import type {DecodedTask, GradingResult, ServerTask, TaskData, TaskServer} from '../types';

function formatDate(date: Date): string {
  const pad = (n: number) => (n < 10 ? `0${n}` : String(n));
  return `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()}`;
}

function queryOf(url: string): Record<string, string> {
  const params: Record<string, string> = {};
  const query = url.indexOf('?') === -1 ? '' : url.slice(url.indexOf('?') + 1).split('#')[0]!;
  new URLSearchParams(query).forEach((value, key) => {
    if (!(key in params)) params[key] = value;
  });
  return params;
}

export function decodeTask(token: string): DecodedTask {
  const payload = jwt.decode(token);
  if (!payload) throw new Error('Task token error: unparsable token');
  const params = queryOf(String(payload['itemUrl'] ?? ''));
  const taskId = params['taskID'];
  if (!taskId) throw new Error('Task token error: taskID missing from itemUrl');
  const randomSeed = payload['randomSeed'];
  if (Number(randomSeed) < 0) {
    throw new Error('Task token error: randomSeed missing or incorrect');
  }
  return {task_id: taskId, random_seed: randomSeed, hints_requested: payload['sHintsRequested'], params, payload};
}

function decodeAnswer(token: string) {
  return {...decodeTask(token), value: jwt.decode(token)['sAnswer']};
}

const promisify = <T>(run: (callback: (error: unknown, result?: T) => void) => void) =>
  new Promise<T>((resolve, reject) => run((error, result) => (error ? reject(error) : resolve(result as T))));

/** Client mode: grading by a grader bundled in the task, with dummy-signed tokens. */
export function createLocalServer(serverTask: ServerTask): TaskServer {
  const loadTaskData = (task: string, body: Record<string, unknown> = {}) =>
    promisify<unknown>((cb) => serverTask.taskData({...body, task: decodeTask(task)}, cb));

  return {
    async taskData(task) {
      const result = (await loadTaskData(task)) as {publicData?: TaskData} & TaskData;
      return result.publicData ?? result;
    },
    async taskHintData(task) {
      const taskData = await loadTaskData(task);
      return promisify<unknown[]>((cb) =>
        serverTask.taskHintData({task: decodeTask(task)}, taskData, cb as (e: unknown, r?: unknown) => void),
      );
    },
    async gradeAnswer(request) {
      const taskData = await loadTaskData(request.task, {...request});
      const answer = decodeAnswer(request.answer);
      const data = await promisify<GradingResult>((cb) =>
        serverTask.gradeAnswer({...request, task: decodeTask(request.task), answer}, taskData, cb),
      );
      const result: GradingResult = {...data};
      for (const key of ['idUser', 'idItem', 'itemUrl', 'idUserAnswer']) result[key] = answer.payload[key];
      result['date'] = formatDate(new Date());
      result.token = jwt.sign(result);
      return result;
    },
    async requestHint(task, request) {
      const askedHint = await promisify<unknown>((cb) => serverTask.requestHint({task: decodeTask(task), request}, cb));
      return {hintToken: jwt.sign({askedHint, date: formatDate(new Date())})};
    },
  };
}
