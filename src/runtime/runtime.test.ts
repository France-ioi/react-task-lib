import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import {createStore} from 'zustand/vanilla';
import {callTask, FakePlatform, FakeServerTask} from '../../tests/protocol/harness/fakes';
import {createPlatformAdapter} from '../platform/platform_adapter';
import {createLocalServer} from '../server/local_server';
import type {PlatformApi, ServerTask, TaskDefinition} from '../types';
import {TaskRuntime} from './runtime';

interface SampleState {
  value: number;
  /** UI-only state, not part of the answer. */
  selected: number | null;
  hintsSeen: number;
}

function setup(overrides: Partial<TaskDefinition<{value: number}>> = {}) {
  const taskStore = createStore<SampleState>(() => ({value: 0, selected: null, hintsSeen: 0}));
  const definition: TaskDefinition<{value: number}> = {
    metaData: {id: 'sample'},
    defaultAnswer: () => ({value: 0}),
    loadAnswer: (answer) => taskStore.setState({value: answer.value}),
    getAnswer: () => ({value: taskStore.getState().value}),
    // Applying hints changes the task state: it must not count as a user change.
    onHintsUpdated: (hints) => taskStore.setState({hintsSeen: hints.length, value: taskStore.getState().value + 100}),
    subscribe: (listener) => taskStore.subscribe(listener),
    Workspace: () => null,
    ...overrides,
  };
  const platform = new FakePlatform({mode: 'mini'});
  const runtime = new TaskRuntime({
    definition,
    options: {defaults: {taskID: 'sample', version: 1}},
    platform: createPlatformAdapter(platform as unknown as PlatformApi),
    server: createLocalServer(new FakeServerTask() as unknown as ServerTask),
  });
  runtime.start();
  return {taskStore, runtime, platform};
}

beforeEach(() => {
  window.history.replaceState(null, '', '/task/index.html?taskID=sample&version=1');
});

let current: TaskRuntime | null = null;
afterEach(() => current?.dispose());

async function loaded() {
  const env = setup();
  current = env.runtime;
  await env.platform.loaded;
  return env;
}

describe('feedback clearing (TaskDefinition.subscribe)', () => {
  it('a change of the answer clears the grading result', async () => {
    const {taskStore, runtime, platform} = await loaded();
    await callTask(platform.task!, 'gradeAnswer', '{"value":2}', window.task_token.getAnswerToken('{"value":2}'));
    expect(runtime.state.grading.score).toBe(20);

    taskStore.setState({selected: 1});
    expect(runtime.state.grading.score).toBe(20);

    taskStore.setState({value: 1});
    expect(runtime.state.grading).toEqual({});
  });

  it('changes made by the lib (onHintsUpdated, loadAnswer) do not clear the feedback', async () => {
    const {taskStore, runtime, platform} = await loaded();
    await runtime.requestHint({hint: 'A'});
    expect(runtime.state.hintRequest.data).toEqual({success: true});
    expect(taskStore.getState()).toMatchObject({hintsSeen: 1, value: 100});

    await callTask(platform.task!, 'gradeAnswer', '{"value":2}', window.task_token.getAnswerToken('{"value":2}'));
    await callTask(platform.task!, 'reloadAnswer', '{"value":5}');
    expect(runtime.state.grading.score).toBe(20);

    taskStore.setState({value: 6});
    expect(runtime.state.grading).toEqual({});
    expect(runtime.state.hintRequest.data).toBeNull();
  });
});

describe('onGraded', () => {
  it('receives each displayed result; its changes do not clear that result', async () => {
    const graded: unknown[] = [];
    const env = setup({
      onGraded: (result, context) => {
        graded.push({score: result.score, version: context.version});
        // e.g. circuit: switch to the input reported by the grader
        env.taskStore.setState({value: 42});
      },
    });
    current = env.runtime;
    await env.platform.loaded;

    await callTask(env.platform.task!, 'gradeAnswer', '{"value":2}', window.task_token.getAnswerToken('{"value":2}'));
    expect(graded).toEqual([{score: 20, version: '1'}]);
    expect(env.taskStore.getState().value).toBe(42);
    expect(env.runtime.state.grading.score).toBe(20);
  });
});

describe('runtime edge cases', () => {
  it('getAnswer works before load', async () => {
    const {platform} = setup();
    current = null;
    expect(await callTask(platform.task!, 'getAnswer')).toEqual(['{"value":0}']);
  });

  it('updateToken(null) is ignored', async () => {
    const {runtime, platform} = await loaded();
    const before = runtime.state.taskToken;
    await callTask(platform.task!, 'updateToken', null);
    expect(runtime.state.taskToken).toBe(before);
  });
});
