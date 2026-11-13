import {describe, expect, it} from 'vitest';
import {fireEvent, screen, waitFor} from '@testing-library/react';
import {callTask, mount} from './harness';

async function loaded(spec?: Parameters<typeof mount>[0]) {
  const mounted = await mount(spec);
  await mounted.platform.loaded;
  await screen.findByTestId('value');
  return mounted;
}

describe('answer — no levels', () => {
  it('getAnswer returns the stable-stringified current answer', async () => {
    const {task} = await loaded();
    expect(await callTask(task, 'getAnswer')).toEqual(['{"value":0}']);

    fireEvent.click(screen.getByText('increment'));
    expect(await callTask(task, 'getAnswer')).toEqual(['{"value":1}']);
  });

  it('reloadAnswer loads the answer into the task', async () => {
    const {task} = await loaded();
    expect(await callTask(task, 'reloadAnswer', '{"value":5}')).toEqual([]);
    await waitFor(() => expect(screen.getByTestId('value').textContent).toBe('5'));
    expect(await callTask(task, 'getAnswer')).toEqual(['{"value":5}']);
  });

  it('reloadAnswer with an empty answer keeps the current answer', async () => {
    const {task} = await loaded();
    fireEvent.click(screen.getByText('increment'));
    expect(await callTask(task, 'reloadAnswer', '')).toEqual([]);
    expect(screen.getByTestId('value').textContent).toBe('1');
  });

  it('reloadAnswer with invalid JSON calls error with "bad answer: ..."', async () => {
    const {task} = await loaded();
    await expect(callTask(task, 'reloadAnswer', '{oops')).rejects.toMatchObject({
      args: [expect.stringMatching(/^bad answer: /)],
    });
  });
});

describe('state — no levels', () => {
  it('getState returns the stable-stringified state dump', async () => {
    const {task} = await loaded();
    fireEvent.click(screen.getByText('increment'));
    expect(await callTask(task, 'getState')).toEqual(['{"value":1}']);
  });

  it('reloadState loads the dump into the task', async () => {
    const {task} = await loaded();
    expect(await callTask(task, 'reloadState', '{"value":4}')).toEqual([]);
    await waitFor(() => expect(screen.getByTestId('value').textContent).toBe('4'));
  });

  it('reloadState with an empty state succeeds without change', async () => {
    const {task} = await loaded();
    expect(await callTask(task, 'reloadState', '')).toEqual([]);
    expect(screen.getByTestId('value').textContent).toBe('0');
  });

  it('reloadState with invalid JSON calls error with "bad state: ..."', async () => {
    const {task} = await loaded();
    await expect(callTask(task, 'reloadState', '{oops')).rejects.toMatchObject({
      args: [expect.stringMatching(/^bad state: /)],
    });
  });
});
