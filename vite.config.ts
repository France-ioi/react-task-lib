/** Build of the library itself (browser entries). The task preset (src/vite) is built by tsc. */
import {readFileSync} from 'node:fs';
import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import autoprefixer from 'autoprefixer';
import {BROWSERSLIST, BUILD_TARGETS} from './src/vite/targets.ts';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
  version: string;
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
};
const externalPackages = [...Object.keys(pkg.dependencies ?? {}), ...Object.keys(pkg.peerDependencies ?? {})];

export default defineConfig({
  plugins: [react()],
  define: {
    __LIB_VERSION__: JSON.stringify(pkg.version),
  },
  css: {
    postcss: {plugins: [autoprefixer({overrideBrowserslist: BROWSERSLIST})]},
  },
  build: {
    target: BUILD_TARGETS,
    cssTarget: BUILD_TARGETS,
    outDir: 'dist',
    emptyOutDir: false,
    sourcemap: true,
    minify: false,
    lib: {
      entry: {
        index: 'src/index.ts',
        polyfills: 'src/polyfills/index.ts',
      },
      formats: ['es'],
      cssFileName: 'style',
    },
    rolldownOptions: {
      // Dependencies are resolved (and lowered to BUILD_TARGETS) by the task's own build.
      external: (id) => externalPackages.some((name) => id === name || id.startsWith(`${name}/`)),
    },
  },
});
