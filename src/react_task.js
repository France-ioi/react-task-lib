//import './shim'
import React from 'react';
import ReactDOM from 'react-dom';
import {Provider} from 'react-redux';
import queryString from 'query-string';
import {createStore, applyMiddleware, compose} from 'redux';
import {default as createSagaMiddleware} from 'redux-saga';
import {call} from 'redux-saga/effects';

import link from './linker';

import AppBundle from './app_bundle';

// TODO :: Make jwt available for miniPlatform in a much better way
import jwt from 'jsonwebtoken';
window.jwt = jwt;


export default function (container, options, TaskBundle, serverTask = null) {
    const platform = window.platform;
    if (process.env.NODE_ENV === 'development') platform.debug = true;

    const {actions, views, selectors, reducer, rootSaga} = link({includes: [AppBundle, TaskBundle]});

    /* Build the store. */
    const safeReducer = function (state, action) {
        try {
            return reducer(state, action);
        } catch (ex) {
            console.error('action failed to reduce', action, ex);
            return {...state, errors: [ex]};
        }
    };

    const sagaMiddleware = createSagaMiddleware();
    let enhancer;

    if (process.env.NODE_ENV === 'development') {
        const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;
        enhancer = composeEnhancers(applyMiddleware(sagaMiddleware));
    } else {
        enhancer = applyMiddleware(sagaMiddleware);
    }

    const store = createStore(safeReducer, {actions, views, selectors}, enhancer);

    /* Start the sagas. */
    function start () {
        sagaMiddleware.run(function* () {
            try {
                yield call(rootSaga);
            } catch (error) {
                console.error('sagas crashed', error);
            }
        });
    }
    start();

    /* Check token, taskID and version */
    const query = queryString.parse(location.search);
    let taskToken = query.sToken;

    if(!query.taskID || !query.version) {
        if(taskToken) {
            // We are inside a platform, alert that there is not taskID /
            // version as it means the task is not configured properly
            alert("taskID or version missing in the URL, cannot continue.");
            // Stop there
            return;
        }
        // Redirect when in standalone mode
        let newSearch = '?';
        query.taskID = window.options.defaults.taskID;
        query.version = window.options.defaults.version;
        for(var key in query) {
            newSearch += '&' + key + '=' + query[key];
        }
        window.location = window.location.origin + window.location.pathname + newSearch;
    }
    if(!taskToken) {
        taskToken = window.task_token.get();
    }
    store.dispatch({type: actions.appInit, payload: {options, taskToken, platform, serverTask}});

    /* Start rendering. */
    ReactDOM.render(<Provider store={store}><views.App/></Provider>, container);

    return {actions, views, store, start};
}
