import React, {useEffect, useState} from 'react';
import {Alert, Modal, Button} from 'react-bootstrap';
import {call, takeEvery, select, take, put, delay} from 'typed-redux-saga';
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {useDispatch} from "react-redux";
import TaskBar from './components/Taskbar';
import Spinner from './components/Spinner';
import makeTaskChannel from './legacy/task';
import makePlatformAdapter from './legacy/platform_adapter';
import makeLocalServerApi from "./local_server_api";
import makeServerApi from "./server_api";
import PlatformBundle from './platform_bundle';
import HintsBundle from './hints_bundle';
import Stars from "./components/Stars";
import {levels, getTaskTokenForVersion} from './levels';
import {EventChannel} from "redux-saga";
import {reducer, TaskState, useAppSelector} from "./typings";
import {TaskResult} from "./components/TaskResult";

function appInitReducer (state: TaskState, {payload: {options}}) {
  if (options) {
    state.options = options;
  }
}

function appInitDoneReducer (state: TaskState, {payload: {platformApi, serverApi, clientVersions}}) {
  let clientVersionsData = null;
  if (clientVersions) {
    clientVersionsData = {};
    for (let [level, {version, locked}] of Object.entries<{version: string, locked: boolean}>(clientVersions)) {
      clientVersionsData[level] = {
        version,
        locked: !!locked,
        answer: null,
        bestAnswer: null,
        score: 0,
      }
    }
  }

  state.platformApi = platformApi;
  state.serverApi = serverApi;
  state.clientVersions = clientVersionsData;
}

function appInitFailedReducer (state: TaskState, {payload: {message}}) {
  state.fatalError = message;
}

function taskInitReducer (state: TaskState, {payload: {taskData}}) {
  state.taskData = taskData;
}

function taskAnswerSavedReducer (state: TaskState, {payload: {answer, version: answerVersion}}) {
  const {taskData: {version: {version}}, clientVersions} = state;
  if (!clientVersions) {
    return;
  }

  const versionLevel = Object.keys(clientVersions).find(key => clientVersions[key].version === (answerVersion ? answerVersion : version));

  state.clientVersions[versionLevel].answer = answer;
}

function taskScoreSavedReducer (state: TaskState, {payload: {score, answer, version: answerVersion}}) {
  const {taskData: {version: {version}}, clientVersions} = state;
  if (!clientVersions) {
    return;
  }

  const versionLevel = Object.keys(clientVersions).find(key => clientVersions[key].version === (answerVersion ? answerVersion : version));
  const currentScore = clientVersions[versionLevel].score;
  if (score > currentScore) {
    state.clientVersions[versionLevel].bestAnswer = answer;
    state.clientVersions[versionLevel].score = score;
    if (score >= 100) {
      const levelNumber = Object.keys(clientVersions).indexOf(versionLevel);
      if (levelNumber + 1 <= Object.keys(clientVersions).length - 1) {
        const nextLevel = Object.keys(clientVersions)[levelNumber + 1];
        if (clientVersions[nextLevel].locked) {
          state.clientVersions[nextLevel].locked = false;
        }
      }
    }
  }
}

function* appSaga () {
  const actions = yield* select(({actions}) => actions);
  yield* takeEvery(actions.appInit, appInitSaga);
  yield* takeEvery(actions.platformValidate, platformValidateSaga);
  yield* takeEvery(actions.taskRestart, taskRestartSaga);
  yield* takeEvery(actions.taskAnswerReloaded, taskAnswerReloadedSaga);
  yield* takeEvery(actions.taskChangeVersion, taskChangeVersionSaga);
  yield* takeEvery('*', function* clearFeedback (action) {
    const {type} = action;
    const keywords = ['Started', 'Moved', 'Changed', 'Added', 'Pressed', 'Reset', 'Reverted'];
    const splittedType = type.split('.');
    if (-1 !== keywords.indexOf(splittedType[splittedType.length - 1])) {
      const state = yield* select();
      if (state.hintRequest.isActive || null !== state.hintRequest.data) {
        yield* put({type: actions.hintRequestFeedbackCleared});
      }
      if (Object.keys(state.grading).length) {
        yield* put({type: actions.platformFeedbackCleared});
      }
    }
  });
}

const taskActions = { /* map task method names to action types */
  load: 'taskLoadEvent',
  unload: 'taskUnloadEvent',
  updateToken: 'taskUpdateTokenEvent',
  getHeight: 'taskGetHeightEvent',
  getMetaData: 'taskGetMetaDataEvent',
  getViews: 'taskGetViewsEvent',
  showViews: 'taskShowViewsEvent',
  getState: 'taskGetStateEvent',
  reloadState: 'taskReloadStateEvent',
  getAnswer: 'taskGetAnswerEvent',
  reloadAnswer: 'taskReloadAnswerEvent',
  gradeAnswer: 'taskGradeAnswerEvent',
};

function* appInitSaga ({payload: {options, platform, serverTask, clientVersions}}) {
  const actions = yield* select(({actions}) => actions);
  let taskChannel: EventChannel<any>, taskApi, platformApi, serverApi;
  try {
    if (null !== serverTask) {
      serverApi = makeLocalServerApi(serverTask);
    } else {
      serverApi = makeServerApi(options.server_module);
    }
    taskChannel = yield* call(makeTaskChannel);
    taskApi = (yield* take<{task: any}>(taskChannel)).task;
    yield* takeEvery(taskChannel, function* ({type, payload}) {
      const action = {type: actions[taskActions[type]], payload};
      yield* put(action);
    });
    platformApi = makePlatformAdapter(platform);
  } catch (ex: any) {
    yield* put({type: actions.appInitFailed, payload: {message: ex.toString()}});
    return;
  }

  yield* put({type: actions.appInitDone, payload: {platformApi, serverApi, clientVersions}});
  window.task = taskApi;
  yield* call(platformApi.initWithTask, taskApi);
}

function* platformValidateSaga ({payload: {mode}}) {
  const {validate} = yield* select((state: TaskState) => state.platformApi);
  /* TODO: error handling, wrap in try/catch block */
  yield* call(validate, mode);
}

function* taskRestartSaga () {
  const actions = yield* select(({actions}) => actions);
  yield* put({type: actions.taskAnswerSaved, payload: {answer: null}});
  const {clientVersions, randomSeed, taskData} = yield* select();
  const taskToken = getTaskTokenForVersion(taskData.version.version, randomSeed, clientVersions);
  yield* put({type: actions.taskTokenUpdated, payload: {token: taskToken}});
  yield* call(taskLoadVersionSaga);
}

function* taskLoadVersionSaga () {
  const serverApi = yield* select((state: TaskState) => state.serverApi);
  const taskToken = yield* select(({taskToken}) => taskToken);
  const actions = yield* select(({actions}) => actions);
  const taskData = yield* call(serverApi, 'tasks', 'taskData', {task: taskToken});

  const clientVersions = yield* select((state: TaskState) => state.clientVersions);
  if (clientVersions) {
    const clientVersion = Object.values(clientVersions).find(clientVersion => clientVersion.version === taskData.version.version);
    if (clientVersion.answer) {
      yield* put({type: actions.taskAnswerLoaded, payload: {taskData, answer: clientVersion.answer}});
      yield* put({type: actions.taskRefresh});
    } else {
      yield* put({type: actions.taskInit, payload: {taskData}});
    }
  } else {
    yield* put({type: actions.taskInit, payload: {taskData}});
  }

  yield* put({type: actions.hintRequestFeedbackCleared});
  yield* put({type: actions.platformFeedbackCleared});
}

function* taskAnswerReloadedSaga () {
  const clientVersions = yield* select((state: TaskState) => state.clientVersions);
  let nextVersion = null;

  let currentReconciledScore = 0;
  for (let level of Object.keys(clientVersions)) {
    const {scoreCoefficient} = levels[level];
    const versionScore = clientVersions[level].score * scoreCoefficient;
    currentReconciledScore = Math.max(currentReconciledScore, versionScore);
  }

  for (let [level, {version}] of Object.entries(clientVersions)) {
    const maxScore = 100 * levels[level].scoreCoefficient;
    if (maxScore > currentReconciledScore) {
      nextVersion = version;
      break;
    }
  }

  if (null !== nextVersion) {
    yield* call(taskChangeVersionSaga, {payload: {version: nextVersion, scroll: false}});
  }
}

function* taskChangeVersionSaga ({payload: {version, scroll}}) {
  const actions = yield* select(({actions}) => actions);
  const taskApi = window.task;

  const currentAnswer = yield* select((state: TaskState) => state.selectors.getTaskAnswer(state));
  yield* put({type: actions.taskAnswerSaved, payload: {answer: currentAnswer}});
  yield new Promise((resolve, reject) => {
    taskApi.gradeAnswer(null, null, resolve, reject, true);
  })

  const clientVersions = yield* select((state: TaskState) => state.clientVersions);
  const randomSeed = yield* select((state: TaskState) => state.randomSeed);
  const taskToken = getTaskTokenForVersion(version, randomSeed, clientVersions);
  yield* put({type: actions.taskTokenUpdated, payload: {token: taskToken}});

  yield* call(taskLoadVersionSaga);

  if (scroll) {
    yield* delay(100);
    window.scrollTo({top: 0, behavior: 'smooth'});
  }
}

function App() {
  const [lockedModalShow, setLockedModalShow] = useState(false);
  const [restartModalShow, setRestartModalShow] = useState(false);

  const taskReady = useAppSelector(state => state.taskReady);
  const fatalError = useAppSelector(state => state.fatalError);
  const taskData = useAppSelector(state => state.taskData);
  const clientVersions = useAppSelector(state => state.clientVersions);
  const {Workspace} = useAppSelector(state => state.views);
  const {platformValidate, taskRestart, taskChangeVersion} = useAppSelector(state => state.actions);
  const dispatch = useDispatch();

  const _validate = () => {
    dispatch({type: platformValidate, payload: {mode: 'done'}});
  };
  const _restart = () => {
    dispatch({type: taskRestart});
    setRestartModalShow(false);
  };
  const changeLevel = (level: string, scroll: boolean = false) => {
    const {version, locked} = clientVersions[level];
    if (locked && window.location.protocol !== 'file:' && -1 === ['localhost', '127.0.0.1', '0.0.0.0'].indexOf(window.location.hostname)) {
      setLockedModalShow(true);
      return;
    }
    dispatch({type: taskChangeVersion, payload: {version, scroll}});
  };

  if (fatalError) {
    return (
      <div>
        <h1>{"A fatal error has occurred"}</h1>
        <p>{fatalError}</p>
      </div>
    );
  }
  if (!taskReady) {
    return <Spinner/>;
  }

  return (
    <div>
      <Modal
        show={lockedModalShow}
        onHide={() => setLockedModalShow(false)}
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            Version verrouillée
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Cette version est verrouillée, et la précédente doit être résolue avant de pouvoir afficher cette version.</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={() => setLockedModalShow(false)}>D'accord</Button>
        </Modal.Footer>
      </Modal>
      <Modal
        show={restartModalShow}
        onHide={() => setRestartModalShow(false)}
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            Confirmation
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Êtes-vous certain de vouloir recommencer cette version à partir de zéro ?</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setRestartModalShow(false)}>Annuler</Button>
          <Button variant="primary" onClick={() => _restart()}>Recommencer</Button>
        </Modal.Footer>
      </Modal>
      {clientVersions && <nav className="nav nav-tabs version-tabs">
        {Object.entries(levels).map(([level, {stars}]) =>
          level in clientVersions && <a
            key={level}
            role="tab"
            tabIndex={-1}
            className={`
              nav-item
              nav-link
              ${taskData && clientVersions[level].version === taskData.version.version ? 'active' : ''}
              ${clientVersions[level].locked ? 'is-locked' : ''}
            `}
            onClick={() => changeLevel(level)}
          >
            Version

            <Stars starsCount={stars} rating={clientVersions[level].score}/>
          </a>
        )}
      </nav>}
      <Workspace key={'version' + taskData.version.version}/>

      <TaskResult
        changeLevel={changeLevel}
      />

      <TaskBar onValidate={_validate} onRestart={() => setRestartModalShow(true)}/>
    </div>
  );
}

export default {
  actions: {
    appInit: 'App.Init',
    appInitDone: 'App.Init.Done',
    appInitFailed: 'App.Init.Failed',
    platformValidate: 'Platform.Validate',
    platformFeedbackCleared: 'Platform.FeedbackCleared',
    taskRestart: 'Task.Restart',
    taskChangeVersion: 'Task.Version.Changed',
    taskAnswerSaved: 'Task.Answer.Saved',
    taskScoreSaved: 'Task.Score.Saved',
  },
  actionReducers: {
    appInit: reducer(appInitReducer),
    appInitDone: reducer(appInitDoneReducer),
    appInitFailed: reducer(appInitFailedReducer),
    taskInit: reducer(taskInitReducer),
    taskAnswerSaved: reducer(taskAnswerSavedReducer),
    taskScoreSaved: reducer(taskScoreSavedReducer),
  },
  saga: appSaga,
  views: {
    App,
  },
  includes: [
    PlatformBundle,
    HintsBundle,
  ]
};
