/* Mounts the sample task on the v3 lib (src/ as of 3.2.17). */
import {vi} from 'vitest';
import type * as ReactDomClient from 'react-dom/client';
import {FakePlatform, FakeServerTask} from './fakes';
import type {MountFn, Mounted} from './types';
import {preparePage, registerCleanup} from './page';

export const mountV3: MountFn = async (spec = {}) => {
  vi.resetModules();
  const {container, options} = preparePage(spec);

  // reactTask does not expose its React root: capture it so the next mount can unmount it.
  vi.doMock('react-dom/client', async (importOriginal) => {
    const original = await importOriginal<typeof ReactDomClient>();
    return {
      ...original,
      createRoot: (...args: Parameters<typeof original.createRoot>) => {
        const root = original.createRoot(...args);
        registerCleanup(() => root.unmount());
        return root;
      },
    };
  });
  const platform = new FakePlatform(spec.platform);
  window.platform = platform;
  const server = new FakeServerTask(spec.server);

  const lib = await import('../../../legacy/v3/src/index');
  const {SampleBundle} = await import('./v3_sample_task');
  lib.reactTask(container, options, SampleBundle, spec.local === false ? null : server, spec.levels);

  const mounted: Mounted = {
    platform,
    server,
    get task() {
      if (!platform.task) throw new Error('platform.initWithTask has not been called yet');
      return platform.task;
    },
    container,
  };
  return mounted;
};
