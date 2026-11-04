import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {bebrasWindow} from './globals';
import {createPlatformAdapter} from './platform/platform_adapter';
import {RuntimeContext} from './react/context';
import {applyBebrasLayout, cloneTaskElement} from './runtime/layout';
import {TaskRuntime} from './runtime/runtime';
import {createHttpServer} from './server/http_server';
import {createLocalServer} from './server/local_server';
import type {
  LevelsConfig,
  PlatformApi,
  ServerTask,
  TaskApi,
  TaskData,
  TaskDefinition,
  TaskOptions,
  TaskServer,
} from './types';
import {App, FatalError} from './ui/App';
import type {IconDefinition, RenderIcon} from './ui/icons';
import {createTranslator} from './i18n';
import {errorMessage} from './utils/errors';

export interface MountOptions {
  /** Client mode: the task's local grader (server-modules). Otherwise options.server_module is used. */
  localServer?: ServerTask;
  /** Levels, overriding the definition's (null: no levels). */
  levels?: LevelsConfig | null;
  /** Default: window.platform. */
  platform?: PlatformApi;
  /** Wrap the app in React.StrictMode (default: true in development). */
  strictMode?: boolean;
  /**
   * FontAwesome icon definitions usable by name in task HTML (`<fontawesomeicon icon="eye">`),
   * in addition to the built-in ones (check, xmark/times, spinner, plus, chevron-*, lock,
   * lock-open, note-sticky/sticky-note, thumbtack, circle-question/question-circle).
   * E.g. `icons: [faEye, faEyeSlash]` with `import {faEye, faEyeSlash} from '@fortawesome/free-solid-svg-icons'`.
   */
  icons?: IconDefinition[];
  /** Custom renderer for task HTML icons, tried first (return null to fall back to `icons`). */
  renderIcon?: RenderIcon;
  /**
   * Page styles (default true): adds `fioi-page` to <body> and `fioi-container` to the container
   * (background, container width — themable with --fioi-body-color, --fioi-container-width…).
   */
  pageStyles?: boolean;
}

export interface MountedTask {
  /** The object given to platform.initWithTask (also window.task). */
  taskApi: TaskApi | null;
  unmount(): void;
}

/** Identity helper giving full type inference to a task definition. */
export function defineTask<Answer, TData extends TaskData = TaskData, Hint = unknown, Dump = Answer>(
  definition: TaskDefinition<Answer, TData, Hint, Dump>,
): TaskDefinition<Answer, TData, Hint, Dump> {
  return definition;
}

function missingServer(): TaskServer {
  const fail = () => Promise.reject(new Error('No grader: options.server_module is missing'));
  return {taskData: fail, taskHintData: fail, gradeAnswer: fail, requestHint: fail};
}

/**
 * Starts a task in `container`: creates the `task` object, hands it to the platform
 * (`platform.initWithTask`) and renders the task UI.
 */
export function mountTask<Answer, TData extends TaskData, Hint, Dump>(
  container: HTMLElement,
  options: TaskOptions,
  definition: TaskDefinition<Answer, TData, Hint, Dump>,
  mountOptions: MountOptions = {},
): MountedTask {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const root = createRoot(container);
  const platformApi = mountOptions.platform ?? bebrasWindow().platform;

  let runtime: TaskRuntime;
  try {
    if (!platformApi) throw new Error('window.platform is not defined: load the Bebras integration API first');
    if (isDevelopment) platformApi.debug = true;
    const server = mountOptions.localServer
      ? createLocalServer(mountOptions.localServer)
      : options.server_module
        ? createHttpServer(options.server_module)
        : missingServer();
    runtime = new TaskRuntime({
      definition,
      options,
      platform: createPlatformAdapter(platformApi),
      server,
      levels: mountOptions.levels,
      icons: mountOptions.icons,
      renderIcon: mountOptions.renderIcon,
    });
    runtime.start();
  } catch (e) {
    const message = errorMessage(e);
    console.error(e);
    const t = createTranslator(options.language);
    root.render(
      <div className="fioi-root fioi-fatal-error" role="alert">
        <h1>{t('app.fatal_error.title')}</h1>
        <p>{message}</p>
      </div>,
    );
    return {taskApi: null, unmount: () => root.unmount()};
  }

  if (mountOptions.pageStyles !== false) {
    document.body.classList.add('fioi-page');
    container.classList.add('fioi-container');
  }

  try {
    cloneTaskElement();
  } catch {
    // ignore
  }

  const app = (
    <RuntimeContext.Provider value={runtime}>
      <div className="fioi-root">
        <App Workspace={definition.Workspace} />
      </div>
    </RuntimeContext.Provider>
  );
  root.render((mountOptions.strictMode ?? isDevelopment) ? <StrictMode>{app}</StrictMode> : app);
  applyBebrasLayout();

  return {
    taskApi: runtime.taskApi,
    unmount() {
      runtime.dispose();
      root.unmount();
    },
  };
}

export {FatalError};
