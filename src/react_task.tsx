//import './shim'
import "url-search-params-polyfill";
import React from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { createStore, applyMiddleware, compose } from "redux";
import { default as createSagaMiddleware } from "redux-saga";
import { call } from "typed-redux-saga";
import link from "./linker";
import AppBundle from "./app_bundle";

export default function(container, options, TaskBundle, serverTask = null, clientVersions = undefined) {
  const platform = window.platform;
  if (process.env["NODE_ENV"] === "development") platform.debug = true;

  const { actions, views, selectors, reducer, rootSaga } = link({ includes: [AppBundle, TaskBundle] });

  /* Build the store. */
  const safeReducer = function(state, action) {
    try {
      return reducer(state, action);
    } catch (ex: any) {
      console.error("action failed to reduce", action, ex);
      return { ...state, errors: [ex] };
    }
  };

  const sagaMiddleware = createSagaMiddleware();
  let enhancer;

  if (process.env["NODE_ENV"] === "development") {
    const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;
    enhancer = composeEnhancers(applyMiddleware(sagaMiddleware));
  } else {
    enhancer = applyMiddleware(sagaMiddleware);
  }

  const store = createStore(safeReducer, { actions, views, selectors }, enhancer);

  /* Start the sagas. */
  function start() {
    sagaMiddleware.run(function* () {
      try {
        yield* call(rootSaga);
      } catch (error) {
        console.error("sagas crashed", error);
      }
    });
  }

  start();

  store.dispatch({ type: actions.appInit, payload: { options, platform, serverTask, clientVersions } });

  try {
    document.body.append(document.getElementById('task').cloneNode(true));
  } catch (e) {
  }

  /* Start rendering. */
  const root = createRoot(container);
  root.render(<Provider store={store}>
    <views.App />
  </Provider>);

  // Set up full width for Bebras platform
  try {
    window.parent.document.getElementById("question-iframe").style.width = "100%";
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    if (!isSafari) {
      (window.parent.document.getElementById("question-iframe") as HTMLIFrameElement).scrolling = "yes";
    } else {
      document.getElementById("container").style.overflowY = "scroll";
      window.parent.addEventListener("resize", function() {
        document.getElementById("container").style.height = document.documentElement.clientHeight + "px";
      });
      setTimeout(function() {
        document.getElementById("container").style.height = document.documentElement.clientHeight + "px";
      }, 1000);
    }
    document.getElementsByTagName("body")[0].style.width = "100%";
    document.getElementById("container").className = "container";
  } catch (e) {
  }

  return { actions, views, store, start };
}
