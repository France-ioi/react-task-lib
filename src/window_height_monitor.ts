import {call} from 'redux-saga/effects';
import {getHeight} from './levels';

const sleep = (timeout) => (new Promise(resolve => setTimeout(resolve, timeout)));

let lastHeight;

export function* windowHeightMonitorSaga (platformApi) {
  while (true) {
    yield sleep(200);
    const height = getHeight();
    if (height !== lastHeight) {
      yield call(platformApi.updateDisplay, {height});
      lastHeight = height;
    }
  }
}
