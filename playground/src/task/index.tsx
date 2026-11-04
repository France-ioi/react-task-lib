// Must stay first: polyfills for the supported browsers.
import '@france-ioi/react-task-lib/polyfills';
import '@france-ioi/react-task-lib/style.css';

import {
  defineTask,
  HintFeedback,
  mountTask,
  TaskInstructions,
  useHints,
  useRequestHint,
  useTaskData,
  type TaskData,
} from '@france-ioi/react-task-lib';
import {create} from 'zustand';
import {installMiniPlatform} from './mini_platform';
import {counterGrader} from './server';
import {runScenario} from './scenario';

interface Answer {
  value: number;
}

interface CounterData extends TaskData {
  target: number;
}

const useCounter = create<Answer>(() => ({value: 0}));

function Workspace() {
  const value = useCounter((state) => state.value);
  const {target, version} = useTaskData<CounterData>();
  const hints = useHints<string>();
  const requestHint = useRequestHint<string>();

  return (
    <div className="counter">
      <TaskInstructions />
      <p>
        Version {version.version}: reach the target with the buttons.{' '}
        {hints.length ? <span data-testid="hint">The target is {target}.</span> : null}
      </p>
      <p>
        <button type="button" onClick={() => useCounter.setState((s) => ({value: s.value - 1}))}>
          −
        </button>{' '}
        <strong data-testid="value">{value}</strong>{' '}
        <button type="button" onClick={() => useCounter.setState((s) => ({value: s.value + 1}))}>
          +
        </button>
      </p>
      <button type="button" onClick={() => void requestHint('target')}>
        Hint
      </button>
      <HintFeedback />
    </div>
  );
}

const counterTask = defineTask<Answer, CounterData, string>({
  metaData: {id: 'http://example.org/tasks/counter', language: 'fr', fullFeedback: true},
  defaultAnswer: () => ({value: 0}),
  loadAnswer: (answer) => useCounter.setState({value: answer.value}),
  getAnswer: () => ({value: useCounter.getState().value}),
  subscribe: (listener) => useCounter.subscribe(listener),
  Workspace,
  levels: {basic: {version: '1'}, easy: {version: '2', locked: true}},
});

export function runReact(container: HTMLElement, options: Record<string, unknown>) {
  installMiniPlatform();
  const mounted = mountTask(container, options, counterTask, {localServer: counterGrader});
  void runScenario();
  return mounted;
}
