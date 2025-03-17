/*
# Performance
- task.getHeight and task.getAnswer are called every second
- task.getViews is called whenever the window's height changes
*/

import {call, fork, put, select, takeEvery} from 'typed-redux-saga';
import stringify from 'json-stable-stringify-without-jsonify';
import queryString from 'query-string';
import {generateTokenUrl} from "./task_token";
import {windowHeightMonitorSaga} from "./window_height_monitor";
import {getAnswerTokenForVersion, getHeight, getTaskTokenForVersion, levels} from "./levels";
import jwt from "jsonwebtoken";
import {reducer, TaskState} from "./typings";

function appInitReducer (state: TaskState) {
  state.grading = {};
  state.gradingLoading = false;
}

function taskHintsLoadedReducer (state: TaskState, {payload: {taskHints}}) {
  state.taskHints = taskHints;
}

function taskRandomSeedUpdatedReducer (state: TaskState, {payload: {randomSeed}}) {
  state.randomSeed = randomSeed;
}

function platformGradingLoadingReducer(state: TaskState, {payload: {loading}}) {
  state.gradingLoading = loading;
}

function taskStateLoadedReducer (state: TaskState, {payload: {hints}}) {
  state.hints = hints;
}

function taskAnswerLoadedReducer (state: TaskState, {payload: {taskData, answer}}) {
  if (taskData) {
    state.taskData = taskData;
  }
  state.answer = answer;
}

function taskShowViewsEventReducer (state: TaskState, {payload: {views}}) {
  state.taskViews = views;
}

function* taskShowViewsEventSaga ({payload: {success}}) {
  /* The reducer has stored the views to show, just call success. */
  yield* call(success);
}

function* taskGetViewsEventSaga ({payload: {success}}) {
  /* XXX only the 'task' view is declared */
  yield* call(success, {'task': {}});
}

function taskUpdateTokenEventReducer (state: TaskState, {payload: {token}}) {
  if (token === null) {
    // eslint-disable-next-line
    console.warn('ignored task.updateToken with null token');
    return;
  }

  state.taskToken = token;
}

function* taskUpdateTokenEventSaga ({payload: {success}}) {
  yield* call(success);
}

function* taskGetHeightEventSaga ({payload: {success}}) {
  yield* call(success, getHeight());
}

function* taskUnloadEventSaga ({payload: {success}}) {
  /* XXX No action needed? */
  yield* call(success);
}

function* taskGetMetaDataEventSaga ({payload: {success, error: _error}}) {
  const metaData = yield* select(({taskMetaData}) => taskMetaData);
  yield* call(success, metaData);
}

function* taskGetAnswerEventSaga ({payload: {success}}) {
  const answer = yield getTaskAnswer();
  yield* call(success, stringify(answer));
}

function* getTaskAnswer () {
  const currentAnswer = yield* select((state: TaskState) => state.selectors.getTaskAnswer(state));

  const clientVersions = yield* select((state: TaskState) => state.clientVersions);
  if (clientVersions) {
    const taskData = yield* select((state: TaskState) => state.taskData);
    const currentVersion = taskData.version.version;
    const answers = {};
    for (let [level, {version, answer}] of Object.entries(clientVersions)) {
      answers[level] = version === currentVersion ? currentAnswer : answer;
    }

    return answers;
  } else {
    return currentAnswer;
  }
}

function* taskReloadAnswerEventSaga ({payload: {answer, success, error}}) {
  const {taskAnswerSaved, taskAnswerLoaded, taskRefresh, taskAnswerReloaded} = yield* select(({actions}) => actions);
  try {
    const clientVersions = yield* select((state: TaskState) => state.clientVersions);
    if (clientVersions && answer) {
      const currentVersion = yield* select((state: TaskState) => state.taskData.version);
      const answerObject = JSON.parse(answer);
      for (let [level, {version}] of Object.entries(clientVersions)) {
        yield* put({type: taskAnswerSaved, payload: {answer: answerObject[level], version}});
        if (version === currentVersion.version) {
          yield* put({type: taskAnswerLoaded, payload: {answer: answerObject[level]}});
          yield* put({type: taskRefresh});
        }
      }
      yield* call(taskGradeAnswerEventSaga, {payload: {_answer: answer, answerToken: null, success, error, silent: true}});
      yield* put({type: taskAnswerReloaded});
    } else if (answer) {
      yield* put({type: taskAnswerLoaded, payload: {answer: JSON.parse(answer)}});
      yield* put({type: taskRefresh});
      yield* call(success);
    } else {
      yield* call(success);
    }
  } catch (ex: any) {
    yield* call(error, `bad answer: ${ex.message}`);
  }
}

function* taskGetStateEventSaga ({payload: {success}}) {
  const dump = yield* select((state: TaskState) => state.selectors.getTaskState(state));
  const strDump = stringify(dump);
  yield* call(success, strDump);
}

function* taskReloadStateEventSaga ({payload: {state, success, error}}) {
  const {taskStateLoaded, taskRefresh} = yield* select(({actions}) => actions);
  try {
    if (state) {
      yield* put({type: taskStateLoaded, payload: {dump: JSON.parse(state)}});
      yield* put({type: taskRefresh});
    }
    yield* call(success);
  } catch (ex: any) {
    yield* call(error, `bad state: ${ex.message}`);
  }
}

function* taskLoadEventSaga ({payload: {views: _views, success, error}}) {
  const platformApi = yield* select((state: TaskState) => state.platformApi);
  const {taskInit, taskTokenUpdated, taskRandomSeedUpdated} = yield* select(({actions}) => actions);

  let {randomSeed, options} = yield* call(platformApi.getTaskParams);
  const query = queryString.parse(location.search);
  // Fix issue with too large randomSeed that overflow int capacity
  randomSeed = String(randomSeed);
  if ('0' === randomSeed) {
    randomSeed = String(query['randomSeed'] ?? Math.floor(Math.random() * 10));
    if (window.task_token) {
      const token = window.task_token.get();
      const payload = jwt.decode(token);
      if (null !== payload.randomSeed && undefined !== payload.randomSeed) {
        randomSeed = String(payload.randomSeed);
      }
    }
  }
  yield* put({type: taskRandomSeedUpdated, payload: {randomSeed}});

  const clientVersions = yield* select((state: TaskState) => state.clientVersions);
  let version;
  if (clientVersions) {
    version = clientVersions[Object.keys(clientVersions)[0]].version;
  } else {
    if (options && options.version) {
      version = options.version;
    } else {
      if (!query['version']) {
        query['taskID'] = window.options.defaults.taskID;
        query['version'] = window.options.defaults.version;
        window.location.href = generateTokenUrl(query);
        return;
      } else {
        version = query['version'];
      }
    }
  }

  const taskToken = getTaskTokenForVersion(version, randomSeed, clientVersions);
  yield* put({type: taskTokenUpdated, payload: {token: taskToken}});

  try {
    const {serverApi} = yield* select((state: TaskState) => state);
    const taskData = yield* call(serverApi, 'tasks', 'taskData', {task: taskToken});
    const taskHints = yield* call(serverApi, 'tasks', 'taskHintData', {task: taskToken});
    yield* put({type: taskInit, payload: {taskData, taskHints}});
    yield* call(success);
    yield* fork(windowHeightMonitorSaga, platformApi);
  } catch (ex: any) {
    yield* call(error, ex);
  }
}

function* taskGradeAnswerEventSaga ({payload: {_answer, answerToken, success, error, silent}}) {
  const {taskAnswerGraded, taskScoreSaved} = yield* select(({actions}) => actions);
  try {
    const clientVersions = yield* select((state: TaskState) => state.clientVersions);
    const randomSeed = yield* select((state: TaskState) => state.randomSeed);
    const {taskToken, taskData, platformApi: {getTaskParams}, serverApi} = yield* select((state: TaskState) => state);
    const {minScore, maxScore, noScore} = yield* call(getTaskParams, null, null);
    if (clientVersions) {
      const answer = yield getTaskAnswer();
      const versionsScore = {};
      let currentScore = null;
      let currentMessage = null;
      let currentScoreToken = null;
      for (let level of Object.keys(clientVersions)) {
        if (!answer[level]) {
          versionsScore[level] = 0;
          continue;
        }
        const newTaskToken = getTaskTokenForVersion(clientVersions[level].version, randomSeed, clientVersions);
        // Always generate answer token when there are client versions
        // because we want the answer token to have only the current version answer.
        const answerToken = getAnswerTokenForVersion(stringify(answer[level]), clientVersions[level].version, randomSeed, clientVersions);
        const {score, message, scoreToken} = yield* call(serverApi, 'tasks', 'gradeAnswer', {
          task: newTaskToken,
          answer: answerToken,
          min_score: minScore,
          max_score: maxScore,
          no_score: noScore,
        });
        versionsScore[level] = score;
        if (clientVersions[level].version === taskData.version.version) {
          currentScore = score;
          currentMessage = message;
          currentScoreToken = scoreToken;
        }
        yield* put({type: taskScoreSaved, payload: {score, answer, version: clientVersions[level].version}});
      }

      let reconciledScore = 0;
      for (let level of Object.keys(clientVersions)) {
        let {scoreCoefficient} = levels[level];
        let versionScore = versionsScore[level] * scoreCoefficient;
        reconciledScore = Math.max(reconciledScore, versionScore);
      }

      if (!silent) {
        yield* put({type: taskAnswerGraded, payload: {grading: {score: currentScore, message: currentMessage}}});
      }
      yield* call(success, reconciledScore, currentMessage, currentScoreToken);
    } else {
      if (!answerToken && window.task_token) {
        const answer = yield getTaskAnswer();
        answerToken = window.task_token.getAnswerToken(stringify(answer));
      }
      const {score, message, token: scoreToken} = yield* call(serverApi, 'tasks', 'gradeAnswer', {
        task: taskToken, /* XXX task should be named taskToken */
        answer: answerToken,  /* XXX answer should be named answerToken */
        min_score: minScore, /* XXX no real point passing min_score, max_score, no_score to server-side grader */
        max_score: maxScore,
        no_score: noScore,
      });
      yield* put({type: taskAnswerGraded, payload: {grading: {score, message}}});
      yield* call(success, score, message, scoreToken);
    }
  } catch (ex: any) {
    const message = ex.message === 'Network request failed' ? "Vous n'êtes actuellement pas connecté à Internet."
      : (ex.message ? ex.message : ex.toString());
    yield* put({type: taskAnswerGraded, payload: {grading: {error: message}}});
    console.error(ex);
    if (error) {
      yield* call(error, message);
    }
  }
}

function taskAnswerGradedReducer (state: TaskState, {payload: {grading}}) {
  state.grading = grading;
}

function platformFeedbackClearedReducer (state: TaskState) {
  state.grading = {};
  state.gradingLoading = false;
}

function taskTokenUpdatedReducer (state: TaskState, {payload: {token}}) {
  state.taskToken = token;
}

export default {
  actions: {
    taskInit: 'Task.Init',
    taskRefresh: 'Task.Refresh',
    taskLoadEvent: 'Task.Event.Load' /* {views, success, error} */,
    taskUnloadEvent: 'Task.Event.Unload' /* {success, error} */,
    taskUpdateTokenEvent: 'Task.Event.UpdateToken' /* {token, success, error} */,
    taskGetHeightEvent: 'Task.Event.GetHeight' /* {success, error} */,
    taskGetMetaDataEvent: 'Task.Event.GetMetaData' /* {success, error} */,
    taskGetViewsEvent: 'Task.Event.GetViews' /* {success, error} */,
    taskShowViewsEvent: 'Task.Event.ShowViews' /* {views, success, error} */,
    taskGetStateEvent: 'Task.Event.GetState' /* {success, error} */,
    taskReloadStateEvent: 'Task.Event.ReloadState' /* {state, success, error} */,
    taskGetAnswerEvent: 'Task.Event.GetAnswer' /* {success, error} */,
    taskReloadAnswerEvent: 'Task.Event.ReloadAnswer' /* {answer, success, error} */,
    taskGradeAnswerEvent: 'Task.Event.GradeAnswer' /* {answer, answerToken, success, error} */,
    taskHintsLoaded: 'Task.Hints.Loaded',
    taskStateLoaded: 'Task.State.Loaded',
    taskAnswerLoaded: 'Task.Answer.Loaded',
    taskAnswerReloaded: 'Task.Answer.Reloaded',
    taskAnswerGraded: 'Task.Answer.Graded',
    taskTokenUpdated: 'Task.Token.Updated',
    taskRandomSeedUpdated: 'Task.RandomSeed.Updated',
    platformGradingLoading: 'Platform.GradingLoading',
    platformFeedbackCleared: 'Platform.FeedbackCleared',
  },
  actionReducers: {
    appInit: reducer(appInitReducer),
    taskShowViewsEvent: reducer(taskShowViewsEventReducer),
    taskUpdateTokenEvent: reducer(taskUpdateTokenEventReducer),
    taskHintsLoaded: reducer(taskHintsLoadedReducer),
    taskStateLoaded: reducer(taskStateLoadedReducer),
    taskAnswerLoaded: reducer(taskAnswerLoadedReducer),
    taskAnswerGraded: reducer(taskAnswerGradedReducer),
    taskTokenUpdated: reducer(taskTokenUpdatedReducer),
    taskRandomSeedUpdated: reducer(taskRandomSeedUpdatedReducer),
    platformGradingLoading: reducer(platformGradingLoadingReducer),
    platformFeedbackCleared: reducer(platformFeedbackClearedReducer),
  },
  saga: function* () {
    const actions = yield* select(({actions}) => actions);
    yield* takeEvery(actions.taskShowViewsEvent, taskShowViewsEventSaga);
    yield* takeEvery(actions.taskGetViewsEvent, taskGetViewsEventSaga);
    yield* takeEvery(actions.taskUpdateTokenEvent, taskUpdateTokenEventSaga);
    yield* takeEvery(actions.taskGetHeightEvent, taskGetHeightEventSaga);
    yield* takeEvery(actions.taskUnloadEvent, taskUnloadEventSaga);
    yield* takeEvery(actions.taskGetStateEvent, taskGetStateEventSaga);
    yield* takeEvery(actions.taskGetMetaDataEvent, taskGetMetaDataEventSaga);
    yield* takeEvery(actions.taskReloadAnswerEvent, taskReloadAnswerEventSaga);
    yield* takeEvery(actions.taskReloadStateEvent, taskReloadStateEventSaga);
    yield* takeEvery(actions.taskGetAnswerEvent, taskGetAnswerEventSaga);
    yield* takeEvery(actions.taskLoadEvent, taskLoadEventSaga);
    yield* takeEvery(actions.taskGradeAnswerEvent, taskGradeAnswerEventSaga);
  }
};
