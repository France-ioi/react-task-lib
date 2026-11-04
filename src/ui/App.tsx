import {useState, type ComponentType} from 'react';
import {useLibState, useLibTranslation, useRuntime} from '../react/context';
import type {LevelName} from '../types';
import {Button} from './Button';
import {Modal} from './Modal';
import {Spinner} from './Spinner';
import {TaskBar} from './TaskBar';
import {TaskResult} from './TaskResult';
import {VersionTabs} from './VersionTabs';

export function FatalError({message}: {message: string}) {
  const t = useLibTranslation();
  return (
    <div className="fioi-fatal-error" role="alert">
      <h1>{t('app.fatal_error.title')}</h1>
      <p>{message}</p>
    </div>
  );
}

/** The task page: level tabs, Workspace, result, task bar. */
export function App({Workspace}: {Workspace: ComponentType}) {
  const runtime = useRuntime();
  const t = useLibTranslation();
  const fatalError = useLibState((state) => state.fatalError);
  const taskReady = useLibState((state) => state.taskReady);
  const version = useLibState((state) => state.taskData?.version.version);
  const disableTaskBar = useLibState((state) => !!state.options.disableTaskBar);
  const workspaceOnly = useLibState((state) => !!state.options.workspaceOnly);
  const [lockedModalOpen, setLockedModalOpen] = useState(false);

  if (fatalError) return <FatalError message={fatalError} />;
  if (!taskReady) return <Spinner />;
  if (workspaceOnly) return <Workspace />;

  const changeLevel = (level: LevelName, scroll = false) => {
    if (!runtime.canOpenLevel(level)) {
      setLockedModalOpen(true);
      return;
    }
    void runtime.changeVersion(runtime.state.levels![level]!.version, scroll);
  };

  return (
    <div className="fioi-app">
      <Modal
        open={lockedModalOpen}
        onClose={() => setLockedModalOpen(false)}
        title={t('app.locked_version.title')}
        footer={<Button onClick={() => setLockedModalOpen(false)}>{t('app.locked_version.ok_button')}</Button>}
      >
        <p>{t('app.locked_version.body')}</p>
      </Modal>
      <VersionTabs onSelect={(level) => changeLevel(level)} />
      <Workspace key={`version-${version}`} />
      <TaskResult changeLevel={changeLevel} />
      {disableTaskBar ? null : <TaskBar />}
    </div>
  );
}
