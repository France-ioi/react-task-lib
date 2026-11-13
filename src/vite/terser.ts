import {minify, type MinifyOptions} from 'terser';
import type {Plugin} from 'vite';

/**
 * Minifies the output with the lib's own terser (Vite's `minify: 'terser'` would require every
 * task to install terser itself). Runs in generateBundle: after Vite's syntax lowering for the
 * target browsers, which re-prints the chunks in renderChunk.
 */
export function terserMinify(options: MinifyOptions): Plugin {
  return {
    name: 'fioi:terser',
    apply: 'build',
    generateBundle: {
      order: 'pre',
      async handler(outputOptions, bundle) {
        for (const file of Object.values(bundle)) {
          if (file.type !== 'chunk') continue;
          const result = await minify(file.code, {
            ...options,
            sourceMap: outputOptions.sourcemap ? {asObject: true} : false,
          });
          if (result.code !== undefined) file.code = result.code;
        }
      },
    },
  };
}
