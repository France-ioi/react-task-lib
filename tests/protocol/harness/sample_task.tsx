/* The sample task of the protocol tests (defineTask + a Zustand store). See MountSpec. */
import {create} from 'zustand';
import {
  defineTask,
  HintFeedback,
  TaskInstructions,
  useHints,
  useReadOnly,
  useRequestHint,
  useTaskVersion,
  useValidateButton,
  ValidateButtonStatus,
} from '../../../src/index';
import {SAMPLE_META_DATA} from './types';

interface Answer {
  value: number;
}

const useSampleStore = create<Answer>(() => ({value: 0}));

function Workspace() {
  const value = useSampleStore((state) => state.value);
  const version = useTaskVersion();
  const hints = useHints();
  const readOnly = useReadOnly();
  const requestHint = useRequestHint();
  const [, setValidateButton] = useValidateButton();

  return (
    <div>
      <TaskInstructions />
      <span data-testid="value">{String(value)}</span>
      <span data-testid="version">{version.version}</span>
      <span data-testid="hints">{JSON.stringify(hints)}</span>
      <span data-testid="readonly">{readOnly ? 'yes' : 'no'}</span>
      <button onClick={() => useSampleStore.setState((state) => ({value: state.value + 1}))}>increment</button>
      <button onClick={() => void requestHint({hint: 'A'})}>hint A</button>
      {Object.values(ValidateButtonStatus).map((status) => (
        <button key={status} onClick={() => setValidateButton(status)}>
          validate {status}
        </button>
      ))}
      <HintFeedback />
    </div>
  );
}

export const sampleTask = defineTask<Answer>({
  metaData: SAMPLE_META_DATA,
  defaultAnswer: () => ({value: 0}),
  loadAnswer: (answer) => useSampleStore.setState({value: answer.value}),
  getAnswer: () => ({value: useSampleStore.getState().value}),
  getState: () => ({value: useSampleStore.getState().value}),
  loadState: (dump) => useSampleStore.setState({value: dump.value}),
  subscribe: (listener) => useSampleStore.subscribe(listener),
  Workspace,
});
