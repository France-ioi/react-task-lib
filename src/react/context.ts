import {createContext, useContext} from 'react';
import {useStore} from 'zustand';
import type {TaskRuntime} from '../runtime/runtime';
import {createIconRenderer, type RenderIcon} from '../ui/icons';
import type {LibState} from '../runtime/store';

export const RuntimeContext = createContext<TaskRuntime | null>(null);

export function useRuntime(): TaskRuntime {
  const runtime = useContext(RuntimeContext);
  if (!runtime) throw new Error('react-task-lib hooks must be used inside a task mounted with mountTask()');
  return runtime;
}

/** Subscribes to a slice of the lib state. */
export function useLibState<T>(selector: (state: LibState) => T): T {
  return useStore(useRuntime().store, selector);
}

/** Translations of the lib's own texts. */
export function useLibTranslation() {
  return useRuntime().t;
}

const defaultRenderIcon = createIconRenderer();

/** Icon renderer for task HTML (built-in icons + mountTask `icons` / `renderIcon`). */
export function useRenderIcon(): RenderIcon {
  return useContext(RuntimeContext)?.renderIcon ?? defaultRenderIcon;
}
