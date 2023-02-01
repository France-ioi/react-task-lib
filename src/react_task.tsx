//import './shim'
import 'url-search-params-polyfill';
import React from 'react';
import ReactDOM from 'react-dom';
import {Provider} from 'react-redux';
import {createStore, applyMiddleware, compose} from 'redux';
import {default as createSagaMiddleware} from 'redux-saga';
import {call} from 'typed-redux-saga';
import link from './linker';

import AppBundle from './app_bundle';

// TODO :: Make jwt available for miniPlatform in a much better way
import jwt from 'jsonwebtoken';
window.jwt = jwt;

export default function (container, options, TaskBundle, serverTask = null, clientVersions) {
    const platform = window.platform;
    if (process.env['NODE_ENV'] === 'development') platform.debug = true;

    const {actions, views, selectors, reducer, rootSaga} = link({includes: [AppBundle, TaskBundle]});

    /* Build the store. */
    const safeReducer = function (state, action) {
        try {
            return reducer(state, action);
        } catch (ex: any) {
            console.error('action failed to reduce', action, ex);
            return {...state, errors: [ex]};
        }
    };

    const sagaMiddleware = createSagaMiddleware();
    let enhancer;

    if (process.env['NODE_ENV'] === 'development') {
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
                yield* call(rootSaga);
            } catch (error) {
                console.error('sagas crashed', error);
            }
        });
    }
    start();

    store.dispatch({type: actions.appInit, payload: {options, platform, serverTask, clientVersions}});

    /* Start rendering. */
    ReactDOM.render(<Provider store={store}><views.App/></Provider>, container);

    return {actions, views, store, start};
}
