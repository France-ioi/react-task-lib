import React from 'react';
import {Alert, Modal, Button} from 'react-bootstrap';
import {call, takeEvery, select, take, put} from 'typed-redux-saga';
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import update from 'immutability-helper';
import {connect, TypedUseSelectorHook, useSelector} from "react-redux";
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
import produce, {current} from "immer";

export interface TaskState {
  taskData: any,
  platformApi: any,
  serverApi: any,
  taskApi: any,
  options: any,
}

export const useAppSelector: TypedUseSelectorHook<TaskState> = useSelector;

export const reducer = (reduce: (state: TaskState, action: any) => void) => (state, action) =>
  produce<TaskState>(state, (draft) => reduce(draft, action));

function appInitReducer (state: TaskState, {payload: {options}}) {
  if (options) {
    state.options = options;
  }
}

function appInitDoneReducer (state, {payload: {platformApi, taskApi, serverApi, clientVersions}}) {
  let clientVersionsData = null;
  if (clientVersions) {
    clientVersionsData = {};
    for (let [level, {version, locked}] of Object.entries(clientVersions)) {
      clientVersionsData[level] = {
        version,
        locked: !!locked,
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

function taskInitReducer (state, {payload: {taskData}}) {
  return {...state, taskData};
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
  let newState = state;
  if (score > currentScore) {
    newState = update(newState, {clientVersions: {[versionLevel]: {bestAnswer: {$set: answer}, score: {$set: score}}}});

    if (score >= 100) {
      const levelNumber = Object.keys(clientVersions).indexOf(versionLevel);
      if (levelNumber + 1 <= Object.keys(clientVersions).length - 1) {
        const nextLevel = Object.keys(clientVersions)[levelNumber + 1];
        if (clientVersions[nextLevel].locked) {
          newState = update(newState, {clientVersions: {[nextLevel]: {locked: {$set: false}}}});
        }
      }
    }
  }

  return newState;
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
    const keywords = ['Started', 'Moved', 'Changed', 'Added', 'Pressed', 'Reset'];
    const splittedType = type.split('.');
    if (-1 !== keywords.indexOf(splittedType[splittedType.length - 1])) {
      yield* put({type: actions.hintRequestFeedbackCleared});
      yield* put({type: actions.platformFeedbackCleared});
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
  let taskChannel, taskApi, platformApi, serverApi;
  try {
    if (null !== serverTask) {
      serverApi = makeLocalServerApi(serverTask);
    } else {
      serverApi = makeServerApi(options.server_module);
    }
    taskChannel = yield* call(makeTaskChannel);
    taskApi = (yield* take(taskChannel)).task;
    yield* takeEvery(taskChannel, function* ({type, payload}) {
      const action = {type: actions[taskActions[type]], payload};
      yield* put(action);
    });
    platformApi = makePlatformAdapter(platform);
  } catch (ex: any) {
    yield* put({type: actions.appInitFailed, payload: {message: ex.toString()}});
    return;
  }

  yield* put({type: actions.appInitDone, payload: {taskApi, platformApi, serverApi, clientVersions}});
  window.task = taskApi;
  yield* call(platformApi.initWithTask, taskApi);
}

function* platformValidateSaga ({payload: {mode}}) {
  const {validate} = yield* select(state => state.platformApi);
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
  const serverApi = yield* select(state => state.serverApi);
  const taskToken = yield* select(({taskToken}) => taskToken);
  const actions = yield* select(({actions}) => actions);
  const taskData = yield* call(serverApi, 'tasks', 'taskData', {task: taskToken});

  const clientVersions = yield* select(state => state.clientVersions);
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
  const clientVersions = yield* select(state => state.clientVersions);
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
    yield* call(taskChangeVersionSaga, {payload: {version: nextVersion}});
  }
}

function* taskChangeVersionSaga ({payload: {version}}) {
  const actions = yield* select(({actions}) => actions);
  const taskApi = yield* select(state => state.taskApi);

  const currentAnswer = yield* select(state => state.selectors.getTaskAnswer(state));
  yield* put({type: actions.taskAnswerSaved, payload: {answer: currentAnswer}});
  yield new Promise((resolve, reject) => {
    taskApi.gradeAnswer(null, null, resolve, reject, true);
  })

  const clientVersions = yield* select(state => state.clientVersions);
  const randomSeed = yield* select(state => state.randomSeed);
  const taskToken = getTaskTokenForVersion(version, randomSeed, clientVersions);
  yield* put({type: actions.taskTokenUpdated, payload: {token: taskToken}});

  yield* call(taskLoadVersionSaga);
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
      lockedModalShow: false,
      restartModalShow: false,
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
        <Modal
          show={this.state.lockedModalShow}
          onHide={() => this.setLockedModalShow(false)}
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
            <Button variant="primary" onClick={() => this.setLockedModalShow(false)}>D'accord</Button>
          </Modal.Footer>
        </Modal>
        <Modal
          show={this.state.restartModalShow}
          onHide={() => this.setRestartModalShow(false)}
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
            <Button variant="secondary" onClick={() => this.setRestartModalShow(false)}>Annuler</Button>
            <Button variant="primary" onClick={() => this._restart()}>Recommencer</Button>
          </Modal.Footer>
        </Modal>
        {clientVersions && <nav className="nav nav-tabs version-tabs">
          {Object.entries(levels).map(([level, {stars}]) =>
            level in clientVersions && <a
              key={level}
              role="tab"
              tabIndex="-1"
              className={`
                nav-item
                nav-link
                ${taskData && clientVersions[level].version === taskData.version.version ? 'active' : ''}
                ${clientVersions[level].locked ? 'is-locked' : ''}
              `}
              onClick={() => this.changeLevel(level)}
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
        <TaskBar onValidate={this._validate} onRestart={() => this.setRestartModalShow(true)}/>
      </div>
    );
  };

  _validate = () => {
    this.props.dispatch({type: this.props.platformValidate, payload: {mode: 'done'}});
  };
  _restart = () => {
    this.props.dispatch({type: this.props.taskRestart});
    this.setRestartModalShow(false);
  };
  changeLevel = (level) => {
    const {version, locked} = this.props.clientVersions[level];
    if (locked && window.location.protocol !== 'file:' && -1 === ['localhost', '127.0.0.1', '0.0.0.0'].indexOf(window.location.hostname)) {
      this.setLockedModalShow(true);
      return;
    }
    this.props.dispatch({type: this.props.taskChangeVersion, payload: {version}});
  };
  upgradeLevel = () => {
    this.changeLevel(this.state.nextLevel);
    this.setModalShow(false);
    window.scrollTo({top: 0, behavior: 'smooth'});
  };
  setModalShow = (newValue) => {
    this.setState({
      upgradeModalShow: newValue,
    });
  };
  setLockedModalShow = (newValue) => {
    this.setState({
      lockedModalShow: newValue,
    });
  };
  setRestartModalShow = (newValue) => {
    this.setState({
      restartModalShow: newValue,
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
    appInit: reducer(appInitReducer),
    appInitDone: appInitDoneReducer,
    appInitFailed: appInitFailedReducer,
    taskInit: taskInitReducer,
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
