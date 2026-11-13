import {afterEach, describe, expect, it} from 'vitest';
import {jwt} from './jwt';
import {TaskToken} from './task_token';
import {generateTokenUrl, getQueryParams} from './url';
import {answerTokenForVersion, taskTokenForVersion} from './version_token';
import {initLevels} from '../levels';

const setUrl = (path: string) => window.history.replaceState(null, '', path);

afterEach(() => {
  setUrl('/');
  delete (window as {task_token?: unknown}).task_token;
});

describe('dummy jwt', () => {
  it('round-trips unicode payloads, adds sub, uses base64url', () => {
    const token = jwt.sign({text: 'été ✓', n: 1});
    expect(token.split('.')).toHaveLength(3);
    expect(token).not.toMatch(/[+/=]/);
    expect(jwt.decode(token)).toEqual({text: 'été ✓', n: 1, sub: 1234567890});
  });

  it('does not mutate the signed data', () => {
    const data = {a: 1};
    jwt.sign(data);
    expect(data).toEqual({a: 1});
  });

  it('throws on malformed tokens', () => {
    expect(() => jwt.decode('nope')).toThrow();
  });
});

describe('url helpers', () => {
  it('getQueryParams keeps the first value', () => {
    expect(getQueryParams('?a=1&b=x%20y&a=2')).toEqual({a: '1', b: 'x y'});
  });

  it('generateTokenUrl builds this page URL with the parameters, skipping empty keys', () => {
    setUrl('/task/index.html?old=1');
    expect(generateTokenUrl({taskID: 'circuit', version: 2, '': 'x', missing: undefined})).toBe(
      `${window.location.origin}/task/index.html?taskID=circuit&version=2`,
    );
    expect(generateTokenUrl({})).toBe(`${window.location.origin}/task/index.html`);
  });
});

describe('TaskToken (miniPlatform semantics)', () => {
  it('signs its data, answer tokens add sAnswer', () => {
    const token = new TaskToken({itemUrl: 'u', randomSeed: '3'});
    expect(jwt.decode(token.get())).toMatchObject({itemUrl: 'u', randomSeed: '3', sHintsRequested: '[]'});
    expect(jwt.decode(token.getAnswerToken('{"v":1}'))).toMatchObject({sAnswer: '{"v":1}'});
  });

  it('returns the sToken of the page when there is one', () => {
    setUrl('/?sToken=abc.def.ghi');
    expect(new TaskToken({}).get()).toBe('abc.def.ghi');
  });

  it('records requested hints once', () => {
    const token = new TaskToken({});
    const hint = jwt.sign({askedHint: 'h1'});
    token.addHintRequest(hint);
    token.addHintRequest(hint);
    expect(jwt.decode(token.get())['sHintsRequested']).toBe('["h1"]');
  });
});

describe('version tokens', () => {
  const levels = initLevels({basic: {version: '1'}, easy: {version: '2'}});

  it('itemUrl targets the version; with levels the seed gets the stars appended', () => {
    setUrl('/task/index.html?taskID=t');
    const params = {version: '2', randomSeed: '7', levels, defaultTaskID: 'fallback'};
    expect(jwt.decode(taskTokenForVersion(params))).toMatchObject({
      itemUrl: `${window.location.origin}/task/index.html?taskID=t&version=2`,
      randomSeed: '72',
    });
    expect(jwt.decode(answerTokenForVersion('{"a":1}', params))).toMatchObject({sAnswer: '{"a":1}', randomSeed: '72'});
  });

  it('without levels the seed is unchanged and the default taskID is used', () => {
    setUrl('/task/index.html');
    expect(
      jwt.decode(taskTokenForVersion({version: '1', randomSeed: '7', levels: null, defaultTaskID: 'fallback'})),
    ).toMatchObject({itemUrl: `${window.location.origin}/task/index.html?taskID=fallback&version=1`, randomSeed: '7'});
  });

  it('updates and returns window.task_token when miniPlatform defines it', () => {
    const existing = new TaskToken({idUser: 5});
    (window as {task_token?: unknown}).task_token = existing;
    const token = taskTokenForVersion({version: '1', randomSeed: '7', levels, defaultTaskID: 't'});
    expect(jwt.decode(token)).toMatchObject({idUser: 5, randomSeed: '71'});
    expect(existing.data['randomSeed']).toBe('71');
  });
});
