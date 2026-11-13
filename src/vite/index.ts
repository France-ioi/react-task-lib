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
import {copyFiles} from './copy-files.js';
import {inlineCss} from './inline-css.js';
import {legalComments} from './legal-comments.js';
import {terserMinify} from './terser.js';
import {BROWSERSLIST, BUILD_TARGETS} from './targets.js';

export {BROWSERSLIST, BUILD_TARGETS, copyFiles, inlineCss, legalComments};

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
  /**
   * Inject the CSS from the script (default true: a single file). false: emit it as a stylesheet
   * next to the script (`index.css` for `index.js`), for pages that link it themselves.
   */
  inlineCss?: boolean;
  /**
   * HTML page of the task, copied as `<outDir>/index.html` (e.g. 'index.prod.html'). It loads
   * the bundle with a classic `<script src="index.js">`.
   */
  page?: string;
  /** Static files or folders copied into outDir (e.g. ['bebras-modules', 'assets']). */
  copy?: string[];
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

    const outDir = options.outDir ?? 'build';
    const fileName = options.fileName ?? 'index.js';
    const config: UserConfig = {
      root,
      plugins: [
        react(),
        legalComments(),
        ...(options.inlineCss === false ? [] : [inlineCss()]),
        copyFiles({root, outDir, page: options.page, copy: options.copy}),
        ...(isProduction
          ? [
              terserMinify({
                // Work around Safari 10/11 bugs (let in loops, await in class methods).
                safari10: true,
                // Keep license comments (/*! … */, @license): e.g. Font Awesome Free icons are CC BY 4.0.
                format: {comments: 'some'},
              }),
            ]
          : []),
        ...(options.plugins ?? []),
      ],
      resolve: {
        // One React (and one lib store) even when the lib is linked from a local working copy.
        dedupe: ['react', 'react-dom', 'zustand'],
      },
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
        outDir,
        emptyOutDir: true,
        sourcemap: isProduction ? false : 'inline',
        // In library mode every asset is inlined as a data URI.
        lib: {
          entry: path.resolve(root, options.entry ?? 'src/index.ts'),
          name: options.globalName ?? 'ReactTask',
          formats: ['iife'],
          fileName: () => fileName,
          cssFileName: fileName.replace(/\.[cm]?js$/, ''),
        },
        rolldownOptions: {
          output: {
            // A single file: no chunks to load (dynamic imports are inlined).
            codeSplitting: false,
            // Vite drops license comments when minifying: keep them (see legalComments()).
            comments: {legal: true},
            // Dead-code elimination (e.g. React's development build) — minification is terserMinify().
            ...(isProduction ? {minify: 'dce-only' as const} : {}),
          },
        },
        // Minified by terserMinify() (the lib's terser).
        minify: false,
        cssMinify: isProduction,
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
