import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {screen} from '@testing-library/react';
import {callTask, IMPL, itV3Bug, mount} from './harness';

type Handler = (body: any) => {status?: number; json?: unknown} | Promise<never>;

let requests: {url: string; body: any}[] = [];
let handler: Handler;

beforeEach(() => {
  requests = [];
  handler = (body) => {
    if (body.action === 'taskData') return {json: {success: true, data: {version: {version: '1'}}}};
    if (body.action === 'taskHintData') return {json: {success: true, data: []}};
    if (body.action === 'gradeAnswer')
      return {json: {success: true, data: {score: 40, message: 'ok', token: 'score-token'}}};
    throw new Error(`unexpected action ${body.action}`);
  };
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit) => {
      const body = JSON.parse(init.body as string);
      requests.push({url, body});
      const res = await handler(body);
      return {status: res.status ?? 200, json: async () => res.json};
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

async function loaded() {
  const mounted = await mount({local: false});
  await mounted.platform.loaded;
  await screen.findByTestId('value');
  return mounted;
}

describe('HTTP server API (options.server_module)', () => {
  it('POSTs JSON {...body, action} to <baseUrl>/tasks', async () => {
    await loaded();
    expect(requests.map((r) => [r.url, r.body.action])).toEqual([
      ['http://grader.test/tasks', 'taskData'],
      ['http://grader.test/tasks', 'taskHintData'],
    ]);
    expect(typeof requests[0]!.body.task).toBe('string');
    const init = (fetch as any).mock.calls[0][1];
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({'Content-Type': 'application/json', Accept: 'application/json'});
  });

  it('gradeAnswer sends task/answer tokens and score bounds, returns score, message, token', async () => {
    const {task} = await loaded();
    const answerToken = window.task_token.getAnswerToken('{"value":1}');
    expect(await callTask(task, 'gradeAnswer', '{"value":1}', answerToken)).toEqual([40, 'ok', 'score-token']);
    const grade = requests.find((r) => r.body.action === 'gradeAnswer')!;
    expect(grade.body).toMatchObject({answer: answerToken, min_score: 0, max_score: 40, no_score: 0});
  });

  it('follows long polling with long_polling_id', async () => {
    let polls = 0;
    const base = handler;
    handler = (body) => {
      if (body.action === 'taskData' && polls < 2) {
        polls++;
        return {json: {success: true, data: {longPolling: true, longPollingFollowUpId: `poll-${polls}`}}};
      }
      return base(body);
    };
    await loaded();
    const taskDataRequests = requests.filter((r) => r.body.action === 'taskData');
    expect(taskDataRequests.map((r) => r.body.long_polling_id)).toEqual([undefined, 'poll-1', 'poll-2']);
  });

  it('sends options.server_module.devel as "task"', async () => {
    const mounted = await mount({
      local: false,
      options: {server_module: {baseUrl: 'http://grader.test/', devel: {randomSeed: 1}}},
    });
    await mounted.platform.loaded;
    expect(requests[0]!.body.task).toEqual({randomSeed: 1});
  });

  it('rejects with result.error when success is false', async () => {
    handler = () => ({json: {success: false, error: 'task not found'}});
    const {platform} = await mount({local: false});
    await expect(platform.loaded).rejects.toMatchObject({args: ['task not found']});
  });

  it('rejects on a non-200 status', async () => {
    handler = () => ({status: 500, json: {}});
    const {platform} = await mount({local: false});
    await expect(platform.loaded).rejects.toMatchObject({args: ['Invalid response status: 500']});
  });

  // KNOWN v3 BUG: server_api rejects with the error *message string*, so the
  // `ex.message === 'Network request failed'` check never matches and the translated
  // "no internet" message is never shown.
  itV3Bug('shows the translated "no internet" message on a network failure while grading', async () => {
    const {task} = await loaded();
    handler = () => Promise.reject(new TypeError('Network request failed'));
    await expect(
      callTask(task, 'gradeAnswer', '{"value":1}', window.task_token.getAnswerToken('{"value":1}')),
    ).rejects.toMatchObject({args: ["Vous n'êtes actuellement pas connecté à Internet."]});
  });

  it.runIf(IMPL === 'v3')('(v3 actual) reports the raw network error message while grading', async () => {
    const {task} = await loaded();
    handler = () => Promise.reject(new TypeError('Network request failed'));
    await expect(
      callTask(task, 'gradeAnswer', '{"value":1}', window.task_token.getAnswerToken('{"value":1}')),
    ).rejects.toMatchObject({args: ['Network request failed']});
  });
});
