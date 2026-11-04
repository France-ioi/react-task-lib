// @vitest-environment node
import {afterEach, describe, expect, it} from 'vitest';
import {defineTaskConfig} from '../../src/vite';

const resolve = (options: Parameters<typeof defineTaskConfig>[0] = {}, mode = 'production') =>
  defineTaskConfig({root: '/task', ...options})({mode});

afterEach(() => {
  delete process.env['TASK_MODE'];
});

describe('defineTaskConfig', () => {
  it('builds a single minified IIFE for the supported browsers', () => {
    const {build} = resolve();
    expect(build?.lib).toMatchObject({entry: '/task/src/index.ts', name: 'ReactTask', formats: ['iife']});
    expect(build?.target).toEqual(['chrome55', 'edge15', 'firefox52', 'safari10.1', 'ios10.3']);
    expect(build?.rolldownOptions?.output).toMatchObject({codeSplitting: false, comments: {legal: true}});
    expect(build?.minify).toBe(false);
    const names = (resolve().plugins as {name?: string}[]).flat().map((p) => p?.name);
    expect(names).toContain('fioi:terser');
    expect(build?.outDir).toBe('build');
  });

  it('defines __TASK_MODE__ (option, then TASK_MODE env, then "server")', () => {
    expect(resolve().define?.['__TASK_MODE__']).toBe('"server"');
    process.env['TASK_MODE'] = 'client';
    expect(resolve().define?.['__TASK_MODE__']).toBe('"client"');
    expect(resolve({mode: 'server'}).define?.['__TASK_MODE__']).toBe('"server"');
  });

  it('rejects an invalid task mode', () => {
    process.env['TASK_MODE'] = 'clinet';
    expect(() => resolve()).toThrow(/invalid task mode "clinet"/);
  });

  it('development mode: unminified, inline source maps, NODE_ENV=development', () => {
    const config = resolve({}, 'development');
    expect((config.plugins as {name?: string}[]).flat().map((p) => p?.name)).not.toContain('fioi:terser');
    expect(config.build?.sourcemap).toBe('inline');
    expect(config.define?.['process.env.NODE_ENV']).toBe('"development"');
    expect(resolve().define?.['process.env.NODE_ENV']).toBe('"production"');
  });

  it('runs task PostCSS plugins before autoprefixer', () => {
    const tailwindLike = {postcssPlugin: 'tailwind-like'};
    const postcss = resolve({postcssPlugins: [tailwindLike]}).css?.postcss;
    const plugins = typeof postcss === 'object' ? (postcss.plugins as {postcssPlugin?: string}[]) : [];
    expect(plugins.map((p) => p.postcssPlugin)).toEqual(['tailwind-like', 'autoprefixer']);
  });

  it('dedupes React (linked lib) and registers the page/copy plugin', () => {
    const config = resolve({page: 'index.prod.html', copy: ['assets']});
    expect(config.resolve?.dedupe).toEqual(['react', 'react-dom', 'zustand']);
    const names = (config.plugins as {name?: string}[]).flat().map((p) => p?.name);
    expect(names).toContain('fioi:copy-files');
  });

  it('merges overrides last', () => {
    const config = resolve({overrides: {build: {outDir: 'dist-task'}, define: {EXTRA: '1'}}});
    expect(config.build?.outDir).toBe('dist-task');
    expect(config.build?.target).toEqual(['chrome55', 'edge15', 'firefox52', 'safari10.1', 'ios10.3']);
    expect(config.define).toMatchObject({EXTRA: '1', __TASK_MODE__: '"server"'});
  });
});
