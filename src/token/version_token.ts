import {bebrasWindow} from '../globals';
import {findLevelByVersion, LEVELS, type Levels} from '../levels';
import {TaskToken, type TaskTokenLike} from './task_token';
import {generateTokenUrl, getQueryParams} from './url';

export interface VersionTokenParams {
  version: string;
  /** Random seed without level suffix. */
  randomSeed: string;
  levels: Levels | null;
  /** Fallback when the page has no taskID parameter (options.defaults.taskID). */
  defaultTaskID: string | undefined;
}

/**
 * Token builder for a version: itemUrl = this page with ?taskID&version; with levels, the random
 * seed gets the level's star count appended ("7" → "71" for basic). Uses (and updates)
 * window.task_token when miniPlatform defines it.
 */
export function taskTokenObject({version, randomSeed, levels, defaultTaskID}: VersionTokenParams): TaskTokenLike {
  const itemUrl = generateTokenUrl({taskID: getQueryParams()['taskID'] ?? defaultTaskID, version});
  let seed = randomSeed;
  if (levels) {
    const level = findLevelByVersion(levels, version);
    if (!level) throw new Error(`No level for version ${version}`);
    seed = `${randomSeed}${LEVELS[level].stars}`;
  }
  const existing = bebrasWindow().task_token;
  if (existing) {
    existing.update({itemUrl, randomSeed: seed});
    return existing;
  }
  return new TaskToken({itemUrl, randomSeed: seed});
}

/** The task token of a version — the sToken query parameter wins when present (real platform). */
export function taskTokenForVersion(params: VersionTokenParams): string {
  const sToken = getQueryParams()['sToken'];
  if (sToken) return sToken;
  return taskTokenObject(params).get();
}

export function answerTokenForVersion(answer: string, params: VersionTokenParams): string {
  return taskTokenObject(params).getAnswerToken(answer);
}
