import React from 'react';
import {Alert, Modal, Button} from 'react-bootstrap';
import {connect} from 'react-redux';
import {call, takeEvery, select, take, put} from 'redux-saga/effects';
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import update from 'immutability-helper';

import TaskBar from './components/Taskbar';
import Spinner from './components/Spinner';
import makeTaskChannel from './legacy/task';
import makePlatformAdapter from './legacy/platform_adapter';
import makeLocalServerApi from "./local_server_api";
import makeServerApi from "./server_api";
import PlatformBundle from './platform_bundle';
import HintsBundle from './hints_bundle';
import {generateTokenUrl, TaskToken} from "./task_token";
import Stars from "./components/Stars";
import {levels} from './levels';

function appInitReducer (state, {payload}) {
  if (payload.options) {
    return {...state, options};
  }

  return state;
}

function appInitDoneReducer (state, {payload: {platformApi, taskApi, serverApi, clientVersions}}) {
  let clientVersionsData = null;
  if (clientVersions) {
    clientVersionsData = {};
    for (let [level, version] of Object.entries(clientVersions)) {
      clientVersionsData[level] = {
        version,
        answer: null,
        bestAnswer: null,
        score: 0,
      }
    }
  }

  return {...state, platformApi, taskApi, serverApi, clientVersions: clientVersionsData};
}

function appInitFailedReducer (state, {payload: {message}}) {
  return {...state, fatalError: message};
}

function taskAnswerSavedReducer (state, {payload: {answer, version: answerVersion}}) {
  const {taskData: {version: {version}}, clientVersions} = state;
  if (!clientVersions) {
    return state;
  }

  const versionLevel = Object.keys(clientVersions).find(key => clientVersions[key].version === (answerVersion ? answerVersion : version));

  return update(state, {clientVersions: {[versionLevel]: {answer: {$set: answer}}}});
}

function taskScoreSavedReducer (state, {payload: {score, answer, version: answerVersion}}) {
  const {taskData: {version: {version}}, clientVersions} = state;
  if (!clientVersions) {
    return state;
  }

  const versionLevel = Object.keys(clientVersions).find(key => clientVersions[key].version === (answerVersion ? answerVersion : version));
  const currentScore = clientVersions[versionLevel].score;
  if (score > currentScore) {
    return update(state, {clientVersions: {[versionLevel]: {bestAnswer: {$set: answer}, score: {$set: score}}}});
  }

  return state;
}

function* appSaga () {
  const actions = yield select(({actions}) => actions);
  yield takeEvery(actions.appInit, appInitSaga);
  yield takeEvery(actions.platformValidate, platformValidateSaga);
  yield takeEvery(actions.taskRestart, taskRestartSaga);
  yield takeEvery(actions.taskChangeVersion, taskChangeVersionSaga);
  yield takeEvery('*', function* clearFeedback (action) {
    const {type} = action;
    const keywords = ['Started', 'Moved', 'Changed', 'Added', 'Pressed', 'Reset'];
    const splittedType = type.split('.');
    if (-1 !== keywords.indexOf(splittedType[splittedType.length - 1])) {
      yield put({type: actions.hintRequestFeedbackCleared});
      yield put({type: actions.platformFeedbackCleared});
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
  const actions = yield select(({actions}) => actions);
  let taskChannel, taskApi, platformApi, serverApi;
  try {
    if (null !== serverTask) {
      serverApi = makeLocalServerApi(serverTask);
    } else {
      serverApi = makeServerApi(options.server_module);
    }
    taskChannel = yield call(makeTaskChannel);
    taskApi = (yield take(taskChannel)).task;
    yield takeEvery(taskChannel, function* ({type, payload}) {
      const action = {type: actions[taskActions[type]], payload};
      yield put(action);
    });
    platformApi = makePlatformAdapter(platform);
  } catch (ex) {
    yield put({type: actions.appInitFailed, payload: {message: ex.toString()}});
    return;
  }

  yield put({type: actions.appInitDone, payload: {taskApi, platformApi, serverApi, clientVersions}});
  window.task = taskApi;
  yield call(platformApi.initWithTask, taskApi);
}

function* platformValidateSaga ({payload: {mode}}) {
  const {validate} = yield select(state => state.platformApi);
  /* TODO: error handling, wrap in try/catch block */
  yield call(validate, mode);
}

function* taskRestartSaga () {
  const actions = yield select(({actions}) => actions);
  yield put({type: actions.taskAnswerSaved, payload: {answer: null}});
  yield call(taskLoadVersionSaga);
}

function* taskLoadVersionSaga () {
  const serverApi = yield select(state => state.serverApi);
  const taskToken = yield select(({taskToken}) => taskToken);
  const actions = yield select(({actions}) => actions);
  const taskData = yield call(serverApi, 'tasks', 'taskData', {task: taskToken});

  yield put({type: actions.taskDataLoaded, payload: {taskData}});

  const clientVersions = yield select(state => state.clientVersions);
  if (clientVersions) {
    const clientVersion = Object.values(clientVersions).find(clientVersion => clientVersion.version === taskData.version.version);
    if (clientVersion.answer) {
      yield put({type: actions.taskAnswerLoaded, payload: {answer: clientVersion.answer}});
      yield put({type: actions.taskRefresh});
    } else {
      yield put({type: actions.taskInit});
    }
  } else {
    yield put({type: actions.taskInit});
  }

  yield put({type: actions.hintRequestFeedbackCleared});
  yield put({type: actions.platformFeedbackCleared});
}

function* taskChangeVersionSaga ({payload: {version}}) {
  const actions = yield select(({actions}) => actions);
  const taskApi = yield select(state => state.taskApi);
  const platformApi = yield select(state => state.platformApi);

  const currentAnswer = yield select(state => state.selectors.getTaskAnswer(state));
  yield put({type: actions.taskAnswerSaved, payload: {answer: currentAnswer}});
  yield new Promise((resolve, reject) => {
    taskApi.gradeAnswer(null, null, resolve, reject, true);
  })

  const query = {};
  query.taskID = window.options.defaults.taskID;
  query.version = version;

  let {randomSeed} = yield call(platformApi.getTaskParams);
  if (Number(randomSeed) === 0) {
    randomSeed = Math.floor(Math.random() * 10);
  }
  const clientVersions = yield select(state => state.clientVersions);
  const versionLevel = Object.keys(clientVersions).find(key => clientVersions[key].version === version);
  randomSeed += levels[versionLevel].stars;

  window.task_token = new TaskToken({
    itemUrl: generateTokenUrl(query),
    randomSeed: randomSeed,
  }, 'buddy');

  const taskToken = window.task_token.get();

  yield put({type: actions.taskTokenUpdated, payload: {token: taskToken}});

  yield call(taskLoadVersionSaga);
}

function AppSelector (state) {
  const {
    taskReady,
    fatalError,
    views: {Workspace},
    actions: {platformValidate, taskRestart, taskChangeVersion},
    grading,
    taskData,
    clientVersions,
  } = state;

  return {
    taskReady,
    fatalError,
    clientVersions,
    Workspace,
    platformValidate,
    taskRestart,
    grading,
    taskData,
    taskChangeVersion,
  };
}

class App extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      upgradeModalShow: false,
      previousScore: 0,
      nextLevel: null,
    };
  };

  static getDerivedStateFromProps({clientVersions, grading, taskData}, currentState) {
    if (!clientVersions || !taskData) {
      return null;
    }
    const versionLevelIndex = Object.keys(clientVersions).findIndex(key => clientVersions[key].version === taskData.version.version);
    if (null === versionLevelIndex || undefined === versionLevelIndex || versionLevelIndex >= Object.keys(clientVersions).length - 1) {
      return null;
    }

    const nextLevel = Object.keys(clientVersions)[versionLevelIndex + 1];

    if (grading && grading.score === 100 && currentState.previousScore !== 100) {
      return {
        upgradeModalShow: true,
        previousScore: grading.score,
        nextLevel,
      }
    } else if (!grading || grading.score !== currentState.previousScore) {
      return {
        previousScore: grading.score,
      };
    }

    return null;
  }

  render () {
    const {taskReady, Workspace, fatalError, grading, taskData, clientVersions} = this.props;

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
          show={this.state.upgradeModalShow}
          onHide={() => this.setModalShow(false)}
          size="lg"
        >
          <Modal.Header closeButton>
            <Modal.Title>
              Bravo !
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p>Bravo, vous avez réussi !</p>
            <p>Nous vous proposons d'essayer la version {this.state.nextLevel ? levels[this.state.nextLevel].stars : ''} étoiles.</p>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="primary" onClick={() => this.upgradeLevel()}>Passer à la suite</Button>
          </Modal.Footer>
        </Modal>
        {clientVersions && <nav className="nav nav-tabs version-tabs">
          {Object.entries(levels).map(([level, {stars}]) =>
            level in clientVersions && <a
              key={level}
              role="tab"
              tabIndex="-1"
              className={`nav-item nav-link ${taskData && clientVersions[level].version === taskData.version.version ? 'active' : ''}`}
              onClick={() => this.changeVersion(clientVersions[level].version)}
            >
              Version

              <Stars starsCount={stars} rating={clientVersions[level].score}/>
            </a>
          )}
        </nav>}
        <Workspace/>
        <div className="result">
          {!grading.error && (grading.score || grading.message) &&
          <Alert variant={typeof grading.score === 'number' && grading.score > 0 ? 'success' : 'danger'}>
            {!grading.error && grading.message &&
            <p style={{fontWeight: 'bold'}}>
              <FontAwesomeIcon icon={typeof grading.score === 'number' && grading.score > 0 ? 'check' : 'times'}/>
              <span dangerouslySetInnerHTML={{__html: grading.message}}/>
            </p>}
            {typeof grading.score === 'number' && taskData && taskData.version && false !== taskData.version.hints &&
            <p><br/>{"Votre score : "}<span style={{fontWeight: 'bold'}}>{grading.score}</span></p>}
          </Alert>
          }
          {grading.error &&
          <Alert variant='danger'>
            <FontAwesomeIcon icon="times"/>
            {grading.error}
          </Alert>
          }
        </div>
        <TaskBar onValidate={this._validate} onRestart={this._restart}/>
      </div>
    );
  };

  _validate = () => {
    this.props.dispatch({type: this.props.platformValidate, payload: {mode: 'done'}});
  };
  _restart = () => {
    this.props.dispatch({type: this.props.taskRestart});
  };
  changeVersion = (version) => {
    this.props.dispatch({type: this.props.taskChangeVersion, payload: {version}});
  };
  upgradeLevel = () => {
    this.changeVersion(this.props.clientVersions[this.state.nextLevel].version);
    this.setModalShow(false);
  };
  setModalShow = (newValue) => {
    this.setState({
      upgradeModalShow: newValue,
    });
  };
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
    appInit: appInitReducer,
    appInitDone: appInitDoneReducer,
    appInitFailed: appInitFailedReducer,
    taskAnswerSaved: taskAnswerSavedReducer,
    taskScoreSaved: taskScoreSavedReducer,
  },
  saga: appSaga,
  views: {
    App: connect(AppSelector)(App)
  },
  includes: [
    PlatformBundle,
    HintsBundle,
  ]
};
