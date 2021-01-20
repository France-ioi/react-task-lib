import {call} from 'redux-saga/effects';

const sleep = (timeout) => (new Promise(resolve => setTimeout(resolve, timeout)));

let lastHeight;

export function* windowHeightMonitorSaga (platformApi) {
  while (true) {
    yield sleep(200);
    const height = window.document.body.clientHeight;
    if (height !== lastHeight) {
      yield call(platformApi.updateDisplay, {height});
      lastHeight = height;
    }
  }
}
