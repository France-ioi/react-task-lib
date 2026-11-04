/**
 * @france-ioi/react-task-lib v4 — public API. See README.md.
 */
export {defineTask, mountTask, type MountOptions, type MountedTask} from './mount';

// Hooks for the task UI
export {
  useTaskData,
  useTaskVersion,
  useHints,
  useRequestHint,
  useHintRequest,
  useReadOnly,
  useRandomSeed,
  useGrading,
  useValidateButton,
  useLevels,
  useTaskActions,
  type LevelsInfo,
} from './react/hooks';
export {useLibTranslation} from './react/context';

// Components
export {TaskInstructions} from './ui/TaskInstructions';
export {HintFeedback} from './ui/HintFeedback';
export {TaskBar} from './ui/TaskBar';
export {Modal, type ModalProps} from './ui/Modal';
export {Button, type ButtonProps} from './ui/Button';
export {Alert} from './ui/Alert';
export {Spinner} from './ui/Spinner';
export {Stars} from './ui/Stars';

// Utilities
export {stableStringify} from './utils/stable_stringify';
export {jwt} from './token/jwt';
export {LEVELS, type LevelInfo} from './levels';

// Types
export {ValidateButtonStatus} from './types';
export type {
  DecodedTask,
  GradeRequest,
  GradingResult,
  HintRequestState,
  HttpServerConfig,
  LevelConfig,
  LevelName,
  LevelsConfig,
  LevelState,
  PlatformApi,
  ServerTask,
  TaskApi,
  TaskContext,
  TaskData,
  TaskDefinition,
  TaskMetaData,
  TaskOptions,
  TaskParams,
  TaskServer,
  TaskVersion,
} from './types';

export {VERSION} from './version';
export {BROWSERSLIST} from './vite/targets';

// Extracted to dist/style.css by the lib build; tasks import '@france-ioi/react-task-lib/style.css'.
import './styles/index.scss';
