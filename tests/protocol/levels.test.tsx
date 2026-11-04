/**
 * @vitest-environment-options {"url": "https://tasks.example.org/"}
 *
 * Not localhost: locked levels are only enforced outside localhost / file:.
 */
import {describe, expect, it} from 'vitest';
import {fireEvent, screen, waitFor, within} from '@testing-library/react';
import {callTask, itV3Bug, mount, type LevelSpec} from './harness';

const LEVELS: Record<string, LevelSpec> = {
  basic: {version: '1'},
  easy: {version: '2', locked: true},
  medium: {version: '3', locked: true},
};

async function loaded(spec: Parameters<typeof mount>[0] = {}) {
  const mounted = await mount({levels: LEVELS, query: '?taskID=sample', ...spec});
  await mounted.platform.loaded;
  await screen.findByTestId('value');
  return mounted;
}

function increment(times: number) {
  for (let i = 0; i < times; i++) fireEvent.click(screen.getByText('increment'));
}

const tabs = () => Array.from(document.querySelectorAll<HTMLElement>('.version-tabs [role=tab]'));

describe('levels', () => {
  it('renders one tab per level, starts on the first level, others locked', async () => {
    await loaded();
    expect(tabs()).toHaveLength(3);
    expect(tabs().map(t => t.className.includes('active'))).toEqual([true, false, false]);
    expect(tabs().map(t => t.className.includes('is-locked'))).toEqual([false, true, true]);
    expect(tabs().map(t => t.querySelectorAll('svg').length)).toEqual([1, 2, 3]);
    expect(screen.getByTestId('version').textContent).toBe('1');
  });

  it('builds a per-level token: random seed + level stars appended', async () => {
    const {server} = await loaded();
    const [taskData] = server.callsTo('taskData');
    expect(taskData.task.params).toMatchObject({taskID: 'sample', version: '1'});
    // miniPlatform seed 7, basic = 1 star → "71"
    expect(taskData.task.random_seed).toBe('71');
  });

  it('getAnswer returns the answers of all levels', async () => {
    const {task} = await loaded();
    increment(2);
    expect(await callTask(task, 'getAnswer')).toEqual(['{"basic":{"value":2},"easy":null,"medium":null}']);
  });

  it('a locked level cannot be opened', async () => {
    await loaded();
    fireEvent.click(tabs()[1]!);
    const dialog = await screen.findByRole('dialog');
    expect(dialog.textContent).toContain('Version verrouillée');
    expect(screen.getByTestId('version').textContent).toBe('1');
  });

  it('gradeAnswer grades every level and returns the best weighted score', async () => {
    const {task, server} = await loaded();
    const answer = '{"basic":{"value":3},"easy":{"value":2},"medium":null}';

    const [score, message, scoreToken] = await callTask(task, 'gradeAnswer', answer, null);

    // basic 100 × 0.25 = 25, easy 20 × 0.5 = 10 → 25
    expect(score).toBe(25);
    // message and token of the current level (basic)
    expect(message).toBe('<b>value=3</b> v1');
    expect(scoreToken).toBeUndefined();
    const grades = server.callsTo('gradeAnswer');
    expect(grades.map(g => [g.task.params.version, g.task.random_seed, g.answer.value])).toEqual([
      ['1', '71', '{"value":3}'],
      ['2', '72', '{"value":2}'],
    ]);
  });

  it('solving a level unlocks the next one and proposes to go there', async () => {
    const {platform} = await loaded();
    increment(3);
    fireEvent.click(screen.getByText('Valider'));

    const dialog = await screen.findByRole('dialog');
    expect(dialog.textContent).toContain('Bravo, vous avez réussi !');
    expect(dialog.textContent).toContain('Nous vous proposons d\'essayer la version 2 étoiles.');
    expect(platform.callsTo('graded')[0]!.slice(0, 2)).toEqual([25, '<b>value=3</b> v1']);
    await waitFor(() => expect(tabs()[1]!.className).not.toContain('is-locked'));
    expect(tabs()[2]!.className).toContain('is-locked');

    fireEvent.click(within(dialog).getByText('Passer à la suite'));
    await waitFor(() => expect(screen.getByTestId('version').textContent).toBe('2'));
    expect(screen.getByTestId('value').textContent).toBe('0');
  });

  async function solveBasicAndGoToEasy() {
    increment(3);
    fireEvent.click(screen.getByText('Valider'));
    fireEvent.click(within(await screen.findByRole('dialog')).getByText('Passer à la suite'));
    await waitFor(() => expect(screen.getByTestId('version').textContent).toBe('2'));
  }

  it('switching level saves the current answer and restores it later', async () => {
    const {task} = await loaded();
    await solveBasicAndGoToEasy();

    increment(1);
    fireEvent.click(tabs()[0]!);
    await waitFor(() => expect(screen.getByTestId('version').textContent).toBe('1'));
    expect(screen.getByTestId('value').textContent).toBe('3');
    expect(document.querySelector('.result')!.textContent).toBe('');

    fireEvent.click(tabs()[1]!);
    await waitFor(() => expect(screen.getByTestId('version').textContent).toBe('2'));
    expect(screen.getByTestId('value').textContent).toBe('1');
    expect(await callTask(task, 'getAnswer')).toEqual(['{"basic":{"value":3},"easy":{"value":1},"medium":null}']);
  });

  // KNOWN v3 BUG: taskChangeVersionSaga calls task.gradeAnswer(<current level answer>, ..., silent)
  // but gradeAnswer expects the all-levels answer, so no level is graded (no-op).
  // Intended behavior (v4): the levels' answers are graded silently when leaving a level.
  itV3Bug('switching level grades the levels\' answers silently', async () => {
    const {server} = await loaded();
    await solveBasicAndGoToEasy();
    const gradesBefore = server.callsTo('gradeAnswer').length;

    increment(1);
    fireEvent.click(tabs()[0]!);
    await waitFor(() => expect(screen.getByTestId('version').textContent).toBe('1'));
    expect(server.callsTo('gradeAnswer').length).toBeGreaterThan(gradesBefore);
  });

  it('reloadAnswer restores all levels, unlocks and opens the first level not fully solved', async () => {
    const {task} = await loaded();
    const answer = '{"basic":{"value":3},"easy":{"value":1},"medium":null}';

    await callTask(task, 'reloadAnswer', answer);

    // basic solved (25 weighted) → easy (max 50) is the first level that can improve the score
    await waitFor(() => expect(screen.getByTestId('version').textContent).toBe('2'));
    expect(screen.getByTestId('value').textContent).toBe('1');
    expect(tabs()[1]!.className).not.toContain('is-locked');
    expect(tabs()[2]!.className).toContain('is-locked');
    expect(await callTask(task, 'getAnswer')).toEqual([answer]);
  });

  it('Recommencer resets only the current level', async () => {
    const {task} = await loaded();
    await callTask(task, 'reloadAnswer', '{"basic":{"value":3},"easy":{"value":1},"medium":null}');
    await waitFor(() => expect(screen.getByTestId('version').textContent).toBe('2'));

    fireEvent.click(screen.getByText('Recommencer'));
    fireEvent.click(within(await screen.findByRole('dialog')).getByText('Recommencer'));

    await waitFor(() => expect(screen.getByTestId('value').textContent).toBe('0'));
    expect(await callTask(task, 'getAnswer')).toEqual(['{"basic":{"value":3},"easy":{"value":0},"medium":null}']);
  });
});

describe('levels — known v3 bugs', () => {
  // KNOWN v3 BUG: when the answer has nothing for the current level, the grading stored for
  // display is null and TaskResult crashes on `grading.error`, which unmounts the whole app.
  itV3Bug('a non-silent gradeAnswer without an answer for the current level keeps the app alive', async () => {
    const {task} = await loaded();
    await callTask(task, 'gradeAnswer', '{"basic":null,"easy":{"value":1},"medium":null}', null);
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(screen.getByTestId('value')).toBeTruthy();
  }, {crashes: true});
});
