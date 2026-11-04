import {describe, expect, it} from 'vitest';
import {screen, waitFor, within} from '@testing-library/react';
import {callTask, fakeJwt, mount, SAMPLE_META_DATA, TaskCallError} from './harness';

describe('load — miniPlatform, no levels', () => {
  it('goes through the miniPlatform bootstrap sequence and renders the workspace', async () => {
    const {platform} = await mount();
    await platform.loaded;

    expect(platform.metaData).toEqual(SAMPLE_META_DATA);
    expect((await screen.findByTestId('value')).textContent).toBe('0');
    expect(screen.getByTestId('version').textContent).toBe('1');
    expect(platform.callsTo('initWithTask')).toHaveLength(1);
    expect(window.task).toBe(platform.task);
  });

  it('requests taskData and taskHintData with the token given by the platform', async () => {
    const {platform, server} = await mount();
    await platform.loaded;

    const [taskData] = server.callsTo('taskData');
    expect(taskData.task.task_id).toBe('sample');
    expect(taskData.task.params).toMatchObject({taskID: 'sample', version: '1'});
    // randomSeed from getTaskParams is "0" with miniPlatform: the seed of the token is used.
    expect(taskData.task.random_seed).toBe(7);
    expect(server.callsTo('taskHintData')).toHaveLength(1);
  });

  it('answers getViews, showViews, getHeight, unload, getMetaData', async () => {
    const {platform, task} = await mount();
    await platform.loaded;

    expect(await callTask(task, 'getViews')).toEqual([{task: {}}]);
    expect(await callTask(task, 'showViews', {task: true})).toEqual([]);
    const [height] = await callTask(task, 'getHeight');
    expect(typeof height).toBe('number');
    expect(await callTask(task, 'getMetaData')).toEqual([SAMPLE_META_DATA]);
    expect(await callTask(task, 'unload')).toEqual([]);
  });

  it('reports the page height to the platform through updateDisplay', async () => {
    const {platform} = await mount();
    await platform.loaded;

    await waitFor(() => expect(platform.callsTo('updateDisplay').length).toBeGreaterThan(0), {timeout: 1000});
    expect(platform.callsTo('updateDisplay')[0]).toEqual([{height: expect.any(Number)}]);
  });

  it('renders the instructions from #instructions, filtered by data-version', async () => {
    const {platform, container} = await mount();
    await platform.loaded;

    // (#instructions itself stays in the page: only look at what the task renders)
    expect(await within(container).findByText('Common instructions')).toBeTruthy();
    expect(within(container).queryByText('Only for version 2')).toBeNull();
  });

  it('shows the version 2 instructions on version 2', async () => {
    const {platform, container} = await mount({query: '?taskID=sample&version=2'});
    await platform.loaded;

    expect(await within(container).findByText('Only for version 2')).toBeTruthy();
  });

  it('takes the version from getTaskParams options when no token was given', async () => {
    const {platform, server} = await mount({
      query: '?taskID=sample',
      platform: {mode: 'manual', taskParams: {options: {version: '3'}}},
    });
    await waitFor(() => expect(platform.task).not.toBeNull());
    await callTask(platform.task!, 'load', {task: true});

    expect(server.callsTo('taskData')[0].task.params.version).toBe('3');
    expect((await screen.findByTestId('version')).textContent).toBe('3');
  });

  it('does not load when the version is missing (it redirects to ?version=<default>)', async () => {
    const {platform, server} = await mount({query: '?taskID=sample', platform: {mode: 'manual'}});
    await waitFor(() => expect(platform.task).not.toBeNull());
    const {task} = platform;

    await callTask(task!, 'updateToken', window.task_token?.get?.() ?? fakeJwt.sign({randomSeed: 1}));
    let settled = false;
    callTask(task!, 'load', {task: true}).then(() => (settled = true), () => (settled = true));
    await new Promise(resolve => setTimeout(resolve, 100));

    // window.location.href is assigned (not observable in jsdom): load never answers.
    expect(settled).toBe(false);
    expect(server.callsTo('taskData')).toHaveLength(0);
  });

  it('does not load hints when options.defaults.hints is false', async () => {
    const {platform, server} = await mount({options: {defaults: {taskID: 'sample', version: 1, hints: false}}});
    await platform.loaded;

    expect(server.callsTo('taskData')).toHaveLength(1);
    expect(server.callsTo('taskHintData')).toHaveLength(0);
  });

  it('calls the load error callback when taskData fails', async () => {
    const {platform} = await mount({server: {failTaskData: 'no such task'}});

    await expect(platform.loaded).rejects.toBeInstanceOf(TaskCallError);
    await expect(platform.loaded).rejects.toMatchObject({args: ['no such task']});
  });
});

describe('load — real platform (token owned by the platform)', () => {
  it('uses the token given through updateToken before load', async () => {
    const {platform, server} = await mount({
      platform: {
        mode: 'platform',
        taskParams: {randomSeed: '42'},
        tokenPayload: {itemUrl: 'http://example.org/?taskID=sample&version=1', randomSeed: 42, idUser: 12, sHintsRequested: '[]'},
      },
    });
    await platform.loaded;

    const [taskData] = server.callsTo('taskData');
    expect(taskData.task.random_seed).toBe(42);
    expect(taskData.task.payload.idUser).toBe(12);
  });

  it('becomes read-only when the token says bSubmissionPossible = false', async () => {
    const {platform} = await mount({
      platform: {
        mode: 'platform',
        tokenPayload: {itemUrl: 'http://example.org/?taskID=sample&version=1', randomSeed: 1, bSubmissionPossible: false},
      },
    });
    await platform.loaded;

    expect((await screen.findByTestId('readonly')).textContent).toBe('yes');
    expect(screen.queryByText('Valider')).toBeNull();
    expect(screen.queryByText('Recommencer')).toBeNull();
  });

  it('takes the token from the sToken query parameter when no token was given', async () => {
    const token = fakeJwt.sign({itemUrl: 'http://example.org/?taskID=sample&version=1', randomSeed: 5, idUser: 99});
    const {platform, server} = await mount({
      query: `?taskID=sample&version=1&sToken=${token}`,
      platform: {mode: 'manual'},
    });
    await waitFor(() => expect(platform.task).not.toBeNull());

    await callTask(platform.task!, 'load', {task: true});
    expect(server.callsTo('taskData')[0].task.payload.idUser).toBe(99);
  });
});

describe('i18n', () => {
  it('uses French by default and options.language otherwise', async () => {
    const first = await mount();
    await first.platform.loaded;
    expect(await screen.findByText('Valider')).toBeTruthy();

    const second = await mount({options: {defaults: {taskID: 'sample', version: 1}, language: 'en'}});
    await second.platform.loaded;
    expect(await screen.findByText('Validate')).toBeTruthy();
    expect(screen.getByText('Restart')).toBeTruthy();
  });
});
