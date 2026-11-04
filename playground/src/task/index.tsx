// Must stay first: polyfills for the supported browsers.
import '@france-ioi/react-task-lib/polyfills';
import '@france-ioi/react-task-lib/style.css';

import {
  Block,
  Button,
  ContentBlock,
  defineTask,
  HintFeedback,
  mountTask,
  NumberPicker,
  Icon,
  TaskInstructions,
  useHints,
  useReadOnly,
  useRequestHint,
  useTaskData,
  type TaskData,
} from '@france-ioi/react-task-lib';
import './task.scss';
import {faNoteSticky} from '@fortawesome/free-solid-svg-icons';
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
  const readOnly = useReadOnly();

  return (
    <div className="counter">
      <ContentBlock title="Votre mission" icon={<Icon icon={faNoteSticky} />}>
        <TaskInstructions />
      </ContentBlock>
      <Block title={`Compteur — version ${version.version}`} tutorial="tutorial-counter">
        <p className="counter__row">
          Reach the target with the buttons:{' '}
          <NumberPicker
            aria-label="value"
            value={value}
            min={0}
            max={10}
            readOnly={readOnly}
            onChange={(v) => useCounter.setState({value: v})}
          />{' '}
          <strong data-testid="value">{value}</strong>
        </p>
      </Block>
      <Block title="Indices">
        <p className="counter__row">
          {hints.length ? <span data-testid="hint">The target is {target}.</span> : 'No hint yet.'}{' '}
          <Button variant="secondary" onClick={() => void requestHint('target')}>
            Hint
          </Button>
        </p>
        <HintFeedback />
      </Block>
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
