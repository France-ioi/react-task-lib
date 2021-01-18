import React from 'react';
import {Alert} from 'react-bootstrap';
import {connect} from 'react-redux';
import {call, fork, takeEvery, select, take, put} from 'redux-saga/effects';

import TaskBar from './components/Taskbar';
import Spinner from './components/Spinner';
import makeTaskChannel from './legacy/task';
import makePlatformAdapter from './legacy/platform_adapter';
import makeLocalServerApi from "./local_server_api";
import makeServerApi from "./server_api";
import PlatformBundle from './platform_bundle';
import HintsBundle from './hints_bundle';

import {windowHeightMonitorSaga} from './window_height_monitor';
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";

function appInitReducer (state, {payload: {taskToken, options}}) {
    return {...state, taskToken, options};
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
    yield takeEvery('*', function* clearFeedback (action) {
        const {type} = action;
        const keywords = ['Started', 'Moved', 'Changed', 'Added', 'Pressed', 'Reset'];
        const splittedType = type.split('.');
        if (-1 !== keywords.indexOf(splittedType[splittedType.length-1])) {
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
    /* XXX Ideally platform.initWithTask would take care of setting its global. */
    window.task = taskApi;
    yield call(platformApi.initWithTask, taskApi);
    /* XXX platform.initWithTask fails to conform to Operations API and never
           return, causing the saga to remain stuck at this point. */
    yield fork(windowHeightMonitorSaga, platformApi);
}

function* platformValidateSaga ({payload: {mode}}) {
    const {validate} = yield select(state => state.platformApi);
    /* TODO: error handling, wrap in try/catch block */
    yield call(validate, mode);
}

function AppSelector (state) {
    const {taskReady, fatalError, views: {Workspace}, actions: {platformValidate}, grading, taskData} = state;

    return {taskReady, fatalError, Workspace, platformValidate, grading, taskData};
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
                            <FontAwesomeIcon icon={typeof grading.score === 'number' && grading.score > 0 ? 'check' : 'times'} />
                            <span dangerouslySetInnerHTML={{__html: grading.message}} />
                        </p>}
                        {typeof grading.score === 'number' && taskData && taskData.version && false !== taskData.version.hints &&
                        <p><br/>{"Votre score : "}<span style={{fontWeight: 'bold'}}>{grading.score}</span></p>}
                    </Alert>
                    }
                    {grading.error &&
                    <Alert variant='danger'>
                        <FontAwesomeIcon icon="times" />
                        {grading.error}
                    </Alert>
                    }
                </div>
                <TaskBar onValidate={this._validate}/>
            </div>
        );
    }
    _validate = () => {
        this.props.dispatch({type: this.props.platformValidate, payload: {mode: 'done'}});
    };
}

export default {
    actions: {
        appInit: 'App.Init',
        appInitDone: 'App.Init.Done',
        appInitFailed: 'App.Init.Failed',
        platformValidate: 'Platform.Validate',
        platformFeedbackCleared: 'Platform.FeedbackCleared',
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
