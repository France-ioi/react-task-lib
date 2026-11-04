/* The sample task written against the v3 API (bundles + redux). See MountSpec for the contract. */
import React from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {produce} from 'immer';
import {TaskInstructions} from '../../../src/index';
import {SAMPLE_META_DATA} from './types';

const reducer = (reduce: (state: any, action: any) => void) => (state: any, action: any) =>
  produce(state, (draft: any) => reduce(draft, action));

function Workspace() {
  const value = useSelector((state: any) => state.answer?.value);
  const version = useSelector((state: any) => state.taskData.version);
  const hints = useSelector((state: any) => state.taskHints);
  const readOnly = useSelector((state: any) => !!state.readOnly);
  const actions = useSelector((state: any) => state.actions);
  const {HintRequestFeedback} = useSelector((state: any) => state.views);
  const dispatch = useDispatch();

  return (
    <div>
      <TaskInstructions version={version}/>
      <span data-testid="value">{String(value)}</span>
      <span data-testid="version">{version.version}</span>
      <span data-testid="hints">{JSON.stringify(hints)}</span>
      <span data-testid="readonly">{readOnly ? 'yes' : 'no'}</span>
      <button onClick={() => dispatch({type: actions.sampleValueChanged})}>increment</button>
      <button onClick={() => dispatch({type: actions.requestHint, payload: {request: {hint: 'A'}}})}>hint A</button>
      {['enabled', 'disabled', 'hidden'].map(status =>
        <button key={status} onClick={() => dispatch({type: actions.taskValidateButtonStatusUpdated, payload: status})}>
          validate {status}
        </button>
      )}
      <HintRequestFeedback/>
    </div>
  );
}

export const SampleBundle = {
  actions: {
    sampleValueChanged: 'Sample.Value.Changed',
  },
  actionReducers: {
    appInit: reducer(state => {
      state.taskMetaData = SAMPLE_META_DATA;
    }),
    taskInit: reducer(state => {
      state.answer = {value: 0};
      state.taskReady = true;
    }),
    taskStateLoaded: reducer((state, {payload: {dump}}) => {
      state.answer = {value: dump.value};
    }),
    sampleValueChanged: reducer(state => {
      state.answer = {value: (state.answer?.value ?? 0) + 1};
    }),
  },
  selectors: {
    getTaskAnswer: (state: any) => state.answer,
    getTaskState: (state: any) => ({value: state.answer?.value}),
  },
  views: {
    Workspace,
  },
};
