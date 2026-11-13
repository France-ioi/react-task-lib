import {render} from '@testing-library/react';
import type {ReactElement} from 'react';
import {RuntimeContext} from '../../react/context';
import {createTranslator} from '../../i18n';
import {createLibStore} from '../../runtime/store';
import type {TaskRuntime} from '../../runtime/runtime';
import type {TaskData} from '../../types';
import {createIconRenderer, type IconDefinition} from '../icons';

/** Renders a component inside a minimal runtime context (lib store + translator). */
export function renderInTask(
  ui: ReactElement,
  {taskData = {version: {version: '1'}}, icons}: {taskData?: TaskData; icons?: IconDefinition[]} = {},
) {
  const store = createLibStore({}, 'fr', null);
  store.setState({taskData, taskReady: true});
  const runtime = {store, t: createTranslator('fr'), renderIcon: createIconRenderer(icons)} as unknown as TaskRuntime;
  return {store, ...render(<RuntimeContext.Provider value={runtime}>{ui}</RuntimeContext.Provider>)};
}

export function setPageHtml(html: string) {
  document.body.innerHTML = `<div id="page">${html}</div>`;
}
