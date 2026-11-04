/**
 * Shared Vite configuration for France-IOI tasks.
 *
 * ```ts
 * // vite.config.ts of a task
 * import {defineTaskConfig} from '@france-ioi/react-task-lib/vite';
 * export default defineTaskConfig({entry: 'src/index.ts'});
 * ```
 *
 * Output: a single classic script (IIFE) — CSS and assets included — that runs from file://
 * on the supported browsers (see BROWSERSLIST), with `window.<name>` as global.
 */
import path from 'node:path';
import react from '@vitejs/plugin-react';
import autoprefixer from 'autoprefixer';
import {mergeConfig, type CSSOptions, type PluginOption, type UserConfig} from 'vite';
import {inlineCss} from './inline-css.js';
import {BROWSERSLIST, BUILD_TARGETS} from './targets.js';

export {BROWSERSLIST, BUILD_TARGETS, inlineCss};

/** A PostCSS plugin, typed through Vite (so that tasks don't need postcss types). */
export type PostcssPlugin = NonNullable<Exclude<CSSOptions['postcss'], string | undefined>['plugins']>[number];

/** 'server': grading by a remote server (options.server_module). 'client': local grader bundled in. */
export type TaskMode = 'server' | 'client';

export interface TaskConfigOptions {
  /** Task entry point. Default: 'src/index.ts'. */
  entry?: string;
  /** Value of the `__TASK_MODE__` constant. Default: process.env.TASK_MODE or 'server'. */
  mode?: TaskMode;
  /** Name of the global variable holding the entry module's exports. Default: 'ReactTask'. */
  globalName?: string;
  /** Output directory. Default: 'build'. */
  outDir?: string;
  /** Output file name. Default: 'index.js'. */
  fileName?: string;
  /** PostCSS plugins run before autoprefixer (e.g. tailwindcss). */
  postcssPlugins?: PostcssPlugin[];
  /** Extra Vite plugins. */
  plugins?: PluginOption[];
  /** Page opened by the dev server. Default: '/index.html'. */
  devPage?: string;
  /** Project root (defaults to process.cwd()). */
  root?: string;
  /** Merged last into the generated configuration. */
  overrides?: UserConfig;
}

export function defineTaskConfig(options: TaskConfigOptions = {}) {
  return ({mode: viteMode}: {mode: string}): UserConfig => {
    const isProduction = viteMode === 'production';
    const root = options.root ?? process.cwd();
    const taskMode = options.mode ?? (process.env['TASK_MODE'] as TaskMode | undefined) ?? 'server';
    if (taskMode !== 'server' && taskMode !== 'client') {
      throw new Error(`defineTaskConfig: invalid task mode "${String(taskMode)}" (expected "server" or "client")`);
    }

    const config: UserConfig = {
      root,
      plugins: [react(), inlineCss(), ...(options.plugins ?? [])],
      define: {
        __TASK_MODE__: JSON.stringify(taskMode),
        'process.env.NODE_ENV': JSON.stringify(isProduction ? 'production' : 'development'),
      },
      css: {
        postcss: {
          plugins: [...(options.postcssPlugins ?? []), autoprefixer({overrideBrowserslist: BROWSERSLIST})],
        },
      },
      build: {
        target: BUILD_TARGETS,
        cssTarget: BUILD_TARGETS,
        outDir: options.outDir ?? 'build',
        emptyOutDir: true,
        sourcemap: isProduction ? false : 'inline',
        // In library mode every asset is inlined as a data URI.
        lib: {
          entry: path.resolve(root, options.entry ?? 'src/index.ts'),
          name: options.globalName ?? 'ReactTask',
          formats: ['iife'],
          fileName: () => options.fileName ?? 'index.js',
        },
        rolldownOptions: {
          output: {
            // A single file: no chunks to load (dynamic imports are inlined).
            codeSplitting: false,
          },
        },
        minify: isProduction ? 'terser' : false,
        terserOptions: {
          // Work around Safari 10/11 bugs (let in loops, await in class methods).
          safari10: true,
          format: {comments: false},
        },
        modulePreload: false,
        copyPublicDir: false,
      },
      server: {
        open: options.devPage ?? '/index.html',
      },
    };

    return options.overrides ? mergeConfig(config, options.overrides) : config;
  };
}
