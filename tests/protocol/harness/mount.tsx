/* Mounts the sample task (sample_task.tsx) on the lib, in a fresh page with fake platform and grader. */
import {vi} from 'vitest';
import {FakePlatform, FakeServerTask} from './fakes';
import type {MountFn, Mounted} from './types';
import {preparePage, registerCleanup} from './page';

export const mountTask: MountFn = async (spec = {}) => {
  vi.resetModules();
  const {container, options} = preparePage(spec);
  const platform = new FakePlatform(spec.platform);
  window.platform = platform;
  const server = new FakeServerTask(spec.server);

  const lib = await import('../../../src/index');
  const {sampleTask} = await import('./sample_task');
  const mounted = lib.mountTask(container, options, sampleTask, {
    localServer: spec.local === false ? undefined : (server as any),
    levels: spec.levels ?? null,
  });
  registerCleanup(() => mounted.unmount());

  const result: Mounted = {
    platform,
    server,
    get task() {
      if (!platform.task) throw new Error('platform.initWithTask has not been called yet');
      return platform.task;
    },
    container,
  };
  return result;
};
