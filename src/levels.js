import {generateTokenUrl, TaskToken} from "./task_token";

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
  return getTaskTokenObject(version, randomSeed, clientVersions).get();
}

export const getAnswerTokenForVersion = (answer, version, randomSeed, clientVersions) => {
  return getTaskTokenObject(version, randomSeed, clientVersions).getAnswerToken(answer);
}

export const getTaskTokenObject = (version, randomSeed, clientVersions) => {
  const query = {};
  query.taskID = window.options.defaults.taskID;
  query.version = version;

  if (clientVersions) {
    const versionLevel = Object.keys(clientVersions).find(key => clientVersions[key].version === version);
    randomSeed += levels[versionLevel].stars;
  }

  return new TaskToken({
    itemUrl: generateTokenUrl(query),
    randomSeed: randomSeed,
  }, 'buddy');
}

export const getHeight = () => {
  if (window.parent && window.parent.document.getElementById('question-iframe')) {
    const iframeTop = window.parent.document.getElementById('question-iframe').getBoundingClientRect().top + window.parent.document.documentElement.scrollTop

    return window.parent.innerHeight - iframeTop - 36;
  }

  return Math.max(document.body.offsetHeight, document.documentElement.offsetHeight);
};
