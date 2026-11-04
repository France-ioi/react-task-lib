import {describe, expect, it} from 'vitest';
import {fireEvent, screen, waitFor, within} from '@testing-library/react';
import {callTask, fakeJwt, mount} from './harness';

async function loaded(spec?: Parameters<typeof mount>[0]) {
  const mounted = await mount(spec);
  await mounted.platform.loaded;
  await screen.findByTestId('value');
  return mounted;
}

function increment(times: number) {
  for (let i = 0; i < times; i++) fireEvent.click(screen.getByText('increment'));
}

describe('gradeAnswer — no levels', () => {
  it('grades with the given answer token and returns score, message, score token', async () => {
    const {task, server} = await loaded();
    const answerToken = window.task_token.getAnswerToken('{"value":2}');

    const [score, message, scoreToken] = await callTask(task, 'gradeAnswer', '{"value":2}', answerToken);

    expect(score).toBe(20);
    expect(message).toBe('<b>value=2</b> v1');
    expect(fakeJwt.decode(scoreToken as string)).toMatchObject({score: 20, message: '<b>value=2</b> v1'});
    const [params] = server.callsTo('gradeAnswer');
    expect(params.answer.value).toBe('{"value":2}');
    expect(params).toMatchObject({min_score: 0, max_score: 40, no_score: 0});
  });

  it('builds the answer token from window.task_token when none is given', async () => {
    const {task, server} = await loaded();
    const [score] = await callTask(task, 'gradeAnswer', '{"value":3}', null);
    expect(score).toBe(100);
    expect(server.callsTo('gradeAnswer')[0].answer.value).toBe('{"value":3}');
  });

  it('grades the answer it is given, not the current one', async () => {
    const {task} = await loaded();
    increment(1);
    const [score] = await callTask(task, 'gradeAnswer', '{"value":2}', window.task_token.getAnswerToken('{"value":2}'));
    expect(score).toBe(20);
  });

  it('displays the grading result (HTML message and score)', async () => {
    const {task, container} = await loaded();
    await callTask(task, 'gradeAnswer', '{"value":2}', window.task_token.getAnswerToken('{"value":2}'));

    const result = container.querySelector('.result')!;
    await waitFor(() => expect(within(result as HTMLElement).getByText('value=2').tagName).toBe('B'));
    expect(result.textContent).toContain('Votre score : 20');
  });

  it('calls error and displays the error when grading fails', async () => {
    const {task, container} = await loaded({server: {failGrade: 'grader exploded'}});
    await expect(callTask(task, 'gradeAnswer', '{"value":2}', window.task_token.getAnswerToken('{"value":2}')))
      .rejects.toMatchObject({args: ['grader exploded']});
    await waitFor(() => expect(container.querySelector('.result')!.textContent).toContain('Une erreur s\'est produite :grader exploded'));
  });

  it('hides the score when taskData.version.hints is false', async () => {
    const {task, container} = await loaded({server: {versionExtra: {hints: false}}});
    await callTask(task, 'gradeAnswer', '{"value":2}', window.task_token.getAnswerToken('{"value":2}'));
    await waitFor(() => expect(container.querySelector('.result')!.textContent).toContain('value=2'));
    expect(container.querySelector('.result')!.textContent).not.toContain('Votre score');
  });

  it('hides the score when taskData.version.showScore is false', async () => {
    const {task, container} = await loaded({server: {versionExtra: {showScore: false}}});
    await callTask(task, 'gradeAnswer', '{"value":2}', window.task_token.getAnswerToken('{"value":2}'));
    await waitFor(() => expect(container.querySelector('.result')!.textContent).toContain('value=2'));
    expect(container.querySelector('.result')!.textContent).not.toContain('Votre score');
  });

  it('clears the grading feedback on a user action', async () => {
    const {task, container} = await loaded();
    await callTask(task, 'gradeAnswer', '{"value":2}', window.task_token.getAnswerToken('{"value":2}'));
    await waitFor(() => expect(container.querySelector('.result')!.textContent).toContain('value=2'));

    increment(1);
    await waitFor(() => expect(container.querySelector('.result')!.textContent).toBe(''));
  });
});

describe('task bar', () => {
  it('Valider calls platform.validate("done"), which grades the current answer', async () => {
    const {platform, container} = await loaded();
    increment(2);

    fireEvent.click(screen.getByText('Valider'));

    await waitFor(() => expect(platform.callsTo('graded')).toHaveLength(1));
    expect(platform.callsTo('validate')).toEqual([['done']]);
    expect(platform.callsTo('graded')[0]!.slice(0, 2)).toEqual([20, '<b>value=2</b> v1']);
    await waitFor(() => expect(container.querySelector('.result')!.textContent).toContain('Votre score : 20'));
  });

  it('the validate button can be disabled, hidden and enabled again by the task', async () => {
    await loaded();
    const validateButton = () => screen.queryByText('Valider')?.closest('button') ?? null;
    expect(validateButton()!.disabled).toBe(false);

    fireEvent.click(screen.getByText('validate disabled'));
    await waitFor(() => expect(validateButton()!.disabled).toBe(true));

    fireEvent.click(screen.getByText('validate hidden'));
    await waitFor(() => expect(validateButton()).toBeNull());

    fireEvent.click(screen.getByText('validate enabled'));
    await waitFor(() => expect(validateButton()!.disabled).toBe(false));
  });

  it('Recommencer asks for confirmation, then resets the answer', async () => {
    const {task} = await loaded();
    increment(2);

    fireEvent.click(screen.getByText('Recommencer'));
    const dialog = await screen.findByRole('dialog');
    expect(dialog.textContent).toContain('Êtes-vous certain de vouloir recommencer');

    fireEvent.click(within(dialog).getByText('Recommencer'));
    await waitFor(() => expect(screen.getByTestId('value').textContent).toBe('0'));
    expect(await callTask(task, 'getAnswer')).toEqual(['{"value":0}']);
  });

  it('Recommencer can be cancelled', async () => {
    await loaded();
    increment(2);

    fireEvent.click(screen.getByText('Recommencer'));
    fireEvent.click(within(await screen.findByRole('dialog')).getByText('Annuler'));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.getByTestId('value').textContent).toBe('2');
  });
});
