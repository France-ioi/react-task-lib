import {describe, expect, it} from 'vitest';
import {fireEvent, screen, waitFor} from '@testing-library/react';
import {fakeJwt, mount} from './harness';

async function loaded(spec?: Parameters<typeof mount>[0]) {
  const mounted = await mount(spec);
  await mounted.platform.loaded;
  await screen.findByTestId('value');
  return mounted;
}

describe('hints', () => {
  it('requestHint → server hint token → platform.askHint → updated token → taskHintData', async () => {
    const {platform, server} = await loaded();
    expect(screen.getByTestId('hints').textContent).toBe('[]');

    fireEvent.click(screen.getByText('hint A'));

    await waitFor(() => expect(screen.getByTestId('hints').textContent).toBe('[{"hint":"A"}]'));
    const [requestHint] = server.callsTo('requestHint');
    expect(requestHint.request).toEqual({hint: 'A'});
    const [[hintToken]] = platform.callsTo('askHint') as [[string]];
    expect(fakeJwt.decode(hintToken).askedHint).toEqual({hint: 'A'});
    // taskHintData is called again with the token updated by the platform
    const hintDataCalls = server.callsTo('taskHintData');
    expect(hintDataCalls).toHaveLength(2);
    expect(JSON.parse(hintDataCalls[1].task.hints_requested)).toEqual([{hint: 'A'}]);
    expect(await screen.findByText("L'indice demandé a été délivré.")).toBeTruthy();
  });

  it('works the same with a real platform owning the token', async () => {
    const {server} = await loaded({
      platform: {mode: 'platform', tokenPayload: {itemUrl: 'http://example.org/?taskID=sample&version=1', randomSeed: 3, sHintsRequested: '[]'}},
    });
    fireEvent.click(screen.getByText('hint A'));
    await waitFor(() => expect(screen.getByTestId('hints').textContent).toBe('[{"hint":"A"}]'));
    expect(server.callsTo('requestHint')[0].task.random_seed).toBe(3);
  });

  it('shows a failure feedback with the step code and the error', async () => {
    const {platform} = await loaded({server: {failRequestHint: 'no more hints'}});
    fireEvent.click(screen.getByText('hint A'));

    expect(await screen.findByText("L'indice demandé n'a pas pu être délivré.")).toBeTruthy();
    // code 20: failure while contacting the server for the hint token
    expect(screen.getByText('Code 20')).toBeTruthy();
    expect(screen.getByText('no more hints')).toBeTruthy();
    expect(platform.callsTo('askHint')).toHaveLength(0);
  });

  it('clears the hint feedback on a user action', async () => {
    await loaded();
    fireEvent.click(screen.getByText('hint A'));
    await screen.findByText("L'indice demandé a été délivré.");

    fireEvent.click(screen.getByText('increment'));
    await waitFor(() => expect(screen.queryByText("L'indice demandé a été délivré.")).toBeNull());
  });
});
