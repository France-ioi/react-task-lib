import type {MountSpec} from './types';

export const INSTRUCTIONS_HTML = '<p>Common instructions</p><p data-version="2">Only for version 2</p>';

let cleanups: Array<() => void> = [];

/** Register something to tear down before the next mount (e.g. the React root). */
export function registerCleanup(cleanup: () => void) {
  cleanups.push(cleanup);
}

export function cleanupPage() {
  const pending = cleanups;
  cleanups = [];
  for (const cleanup of pending) cleanup();
}

/** Reset the document like a fresh task index.html, and return the entry point arguments. */
export function preparePage(spec: MountSpec) {
  cleanupPage();
  document.body.innerHTML = `<div id="container" class="container"></div><div id="instructions">${INSTRUCTIONS_HTML}</div>`;
  window.history.replaceState(null, '', `/task/index.html${spec.query ?? '?taskID=sample&version=1'}`);
  const options = {
    defaults: {taskID: 'sample', version: 1},
    ...(spec.local === false ? {server_module: {baseUrl: 'http://grader.test/'}} : {}),
    ...spec.options,
  };
  // In index.html, `var options = {...}` is a global.
  window.options = options;
  delete window.task;
  delete window.task_token;
  const container = document.getElementById('container')!;
  return {container, options};
}
