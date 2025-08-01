import {generateTokenUrl, TaskToken} from "./task_token";
import queryString from 'query-string';

export const levels = {
  basic: {
    stars: 1,
    scoreCoefficient: 0.25,
  },
  easy: {
    stars: 2,
    scoreCoefficient: 0.5,
  },
  medium: {
    stars: 3,
    scoreCoefficient: 0.75,
  },
  hard: {
    stars: 4,
    scoreCoefficient: 1,
  },
}

export const getTaskTokenForVersion = (version, randomSeed, clientVersions) => {
  const query = queryString.parse(location.search);
  // Use token from query string if we are in a platform
  if (query['sToken']) {
    return query['sToken'];
  }

  return getTaskTokenObject(version, randomSeed, clientVersions).get();
}

export const getAnswerTokenForVersion = (answer, version, randomSeed, clientVersions) => {
  return getTaskTokenObject(version, randomSeed, clientVersions).getAnswerToken(answer);
}

export const getTaskTokenObject = (version, randomSeed, clientVersions) => {
  const query: {taskID?: string, version?: string} = {};
  query.taskID = queryString.parse(location.search)['taskID'] ?? window.options.defaults.taskID;
  query.version = version;

  if (clientVersions) {
    const versionLevel = Object.keys(clientVersions).find(key => clientVersions[key].version === version);
    randomSeed += levels[versionLevel].stars;
  }

  if (window.task_token) {
    window.task_token.update({
      itemUrl: generateTokenUrl(query),
      randomSeed: randomSeed,
    });

    return window.task_token;
  }

  return new TaskToken({
    itemUrl: generateTokenUrl(query),
    randomSeed: randomSeed,
  }, 'buddy');
}

export const getHeight = () => {
  return Math.max(document.body.offsetHeight, document.documentElement.offsetHeight);
};
