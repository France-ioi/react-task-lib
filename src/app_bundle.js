import React from 'react';
import {Alert} from 'react-bootstrap';
import {connect} from 'react-redux';
import {call, takeEvery, select, take, put} from 'redux-saga/effects';
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";

import TaskBar from './components/Taskbar';
import Spinner from './components/Spinner';
import makeTaskChannel from './legacy/task';
import makePlatformAdapter from './legacy/platform_adapter';
import makeLocalServerApi from "./local_server_api";
import makeServerApi from "./server_api";
import PlatformBundle from './platform_bundle';
import HintsBundle from './hints_bundle';

function appInitReducer (state, {payload}) {
  if (payload.options) {
    return {...state, options};
  }

  return state;
}

function appInitDoneReducer (state, {payload: {platformApi, taskApi, serverApi}}) {
  return {...state, platformApi, taskApi, serverApi};
}

function appInitFailedReducer (state, {payload: {message}}) {
  return {...state, fatalError: message};
}

function* appSaga () {
  const actions = yield select(({actions}) => actions);
  yield takeEvery(actions.appInit, appInitSaga);
  yield takeEvery(actions.platformValidate, platformValidateSaga);
  yield takeEvery(actions.taskRestart, taskRestartSaga);
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

function* appInitSaga ({payload: {options, platform, serverTask}}) {
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

  yield put({type: actions.appInitDone, payload: {taskApi, platformApi, serverApi}});
  window.task = taskApi;
  yield call(platformApi.initWithTask, taskApi);
}

function* platformValidateSaga ({payload: {mode}}) {
  const {validate} = yield select(state => state.platformApi);
  /* TODO: error handling, wrap in try/catch block */
  yield call(validate, mode);
}

function* taskRestartSaga () {
  const serverApi = yield select(state => state.serverApi);
  const actions = yield select(({actions}) => actions);
  const taskToken = yield select(({taskToken}) => taskToken);

  const taskData = yield call(serverApi, 'tasks', 'taskData', {task: taskToken});
  yield put({type: actions.taskDataLoaded, payload: {taskData}});
  yield put({type: actions.taskInit});
  yield put({type: actions.hintRequestFeedbackCleared});
  yield put({type: actions.platformFeedbackCleared});
}

function AppSelector (state) {
  const {
    taskReady,
    fatalError,
    views: {Workspace},
    actions: {platformValidate, taskRestart},
    grading,
    taskData
  } = state;

  return {taskReady, fatalError, Workspace, platformValidate, taskRestart, grading, taskData};
}

class App extends React.PureComponent {
  render () {
    const {taskReady, Workspace, fatalError, grading, taskData} = this.props;

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
  }

  _validate = () => {
    this.props.dispatch({type: this.props.platformValidate, payload: {mode: 'done'}});
  };
  _restart = () => {
    this.props.dispatch({type: this.props.taskRestart});
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
  },
  actionReducers: {
    appInit: appInitReducer,
    appInitDone: appInitDoneReducer,
    appInitFailed: appInitFailedReducer,
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
