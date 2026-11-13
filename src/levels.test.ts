import {describe, expect, it} from 'vitest';
import {firstImprovableVersion, initLevels, reconciledScore, withLevelAnswer, withLevelScore} from './levels';

const levels = () =>
  initLevels({basic: {version: '1'}, easy: {version: '2', locked: true}, medium: {version: '3', locked: true}})!;

describe('levels', () => {
  it('initialises the level states in the given order', () => {
    expect(Object.keys(levels())).toEqual(['basic', 'easy', 'medium']);
    expect(levels().easy).toEqual({version: '2', locked: true, answer: null, bestAnswer: null, score: 0});
    expect(initLevels(null)).toBeNull();
  });

  it('task score = best level score × coefficient', () => {
    expect(reconciledScore({basic: 100, easy: 20})).toBe(25);
    expect(reconciledScore({basic: 100, easy: 60})).toBe(30);
    expect(reconciledScore({})).toBe(0);
  });

  it('keeps better scores only, and unlocks the next level at 100', () => {
    let state = withLevelScore(levels(), '1', 40, {v: 4});
    expect(state.basic).toMatchObject({score: 40, bestAnswer: {v: 4}});
    state = withLevelScore(state, '1', 30, {v: 3});
    expect(state.basic!.score).toBe(40);
    state = withLevelScore(state, '1', 100, {v: 10});
    expect(state.easy!.locked).toBe(false);
    expect(state.medium!.locked).toBe(true);
  });

  it('first improvable version', () => {
    expect(firstImprovableVersion(levels())).toBe('1');
    expect(firstImprovableVersion(withLevelScore(levels(), '1', 100, null))).toBe('2');
    const all = ['1', '2', '3'].reduce((state, version) => withLevelScore(state, version, 100, null), levels());
    expect(firstImprovableVersion(all)).toBeNull();
  });

  it('saves level answers by version', () => {
    expect(withLevelAnswer(levels(), '2', {v: 1}).easy!.answer).toEqual({v: 1});
    expect(withLevelAnswer(levels(), '9', {v: 1})).toEqual(levels());
  });
});
