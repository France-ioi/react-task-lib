import type {LevelName, LevelsConfig, LevelState} from './types';

export interface LevelInfo {
  stars: number;
  /** Weight of the level score in the task score. */
  scoreCoefficient: number;
}

export const LEVELS: Record<LevelName, LevelInfo> = {
  basic: {stars: 1, scoreCoefficient: 0.25},
  easy: {stars: 2, scoreCoefficient: 0.5},
  medium: {stars: 3, scoreCoefficient: 0.75},
  hard: {stars: 4, scoreCoefficient: 1},
};

export type Levels = Partial<Record<LevelName, LevelState>>;

export function initLevels(config: LevelsConfig | null | undefined): Levels | null {
  if (!config) return null;
  const levels: Levels = {};
  for (const name of Object.keys(config) as LevelName[]) {
    const {version, locked} = config[name]!;
    levels[name] = {version, locked: !!locked, answer: null, bestAnswer: null, score: 0};
  }
  return levels;
}

export const levelNames = (levels: Levels): LevelName[] => Object.keys(levels) as LevelName[];

export function findLevelByVersion(levels: Levels, version: string): LevelName | null {
  return levelNames(levels).find((name) => levels[name]!.version === version) ?? null;
}

/** Task score: the best level score weighted by its coefficient. */
export function reconciledScore(scores: Partial<Record<LevelName, number>>): number {
  let score = 0;
  for (const name of Object.keys(scores) as LevelName[]) {
    score = Math.max(score, (scores[name] ?? 0) * LEVELS[name].scoreCoefficient);
  }
  return score;
}

/** Version of the first level whose maximum weighted score beats the current task score. */
export function firstImprovableVersion(levels: Levels): string | null {
  const current = reconciledScore(Object.fromEntries(levelNames(levels).map((name) => [name, levels[name]!.score])));
  for (const name of levelNames(levels)) {
    if (100 * LEVELS[name].scoreCoefficient > current) return levels[name]!.version;
  }
  return null;
}

/** Record a level score; a better score keeps the answer and, at 100, unlocks the next level. */
export function withLevelScore(levels: Levels, version: string, score: number, answer: unknown): Levels {
  const name = findLevelByVersion(levels, version);
  if (!name || score <= levels[name]!.score) return levels;
  const next = {...levels, [name]: {...levels[name]!, score, bestAnswer: answer}};
  if (score >= 100) {
    const names = levelNames(levels);
    const nextName = names[names.indexOf(name) + 1];
    if (nextName && next[nextName]!.locked) next[nextName] = {...next[nextName]!, locked: false};
  }
  return next;
}

export function withLevelAnswer(levels: Levels, version: string, answer: unknown): Levels {
  const name = findLevelByVersion(levels, version);
  if (!name) return levels;
  return {...levels, [name]: {...levels[name]!, answer}};
}
