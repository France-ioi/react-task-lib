import type {Plugin} from 'vite';

const LEGAL_COMMENT = /\/\*![\s\S]*?\*\/|\/\*[^*]*?@(?:license|preserve)[\s\S]*?\*\/|\/\/![^\n]*/g;

/**
 * Keeps the license comments of bundled code (`/*! … *\/`, `//!`, `@license`, `@preserve`), which
 * the minifier may drop when it moves or inlines the code they are attached to: they are collected
 * before minification and written once at the top of each output file.
 * (e.g. Font Awesome Free icons are CC BY 4.0: their attribution must stay.)
 */
export function legalComments(): Plugin {
  const collected = new Map<string, Set<string>>();
  return {
    name: 'fioi:legal-comments',
    apply: 'build',
    renderChunk: {
      order: 'pre',
      handler(code, chunk) {
        const comments = collected.get(chunk.fileName) ?? new Set<string>();
        for (const match of code.match(LEGAL_COMMENT) ?? []) comments.add(match.trim());
        collected.set(chunk.fileName, comments);
        return null;
      },
    },
    generateBundle(_options, bundle) {
      for (const file of Object.values(bundle)) {
        if (file.type !== 'chunk') continue;
        const comments = collected.get(file.fileName);
        if (!comments?.size) continue;
        const header = Array.from(comments)
          .filter((comment) => file.code.indexOf(comment) === -1)
          .map((comment) => (comment.indexOf('//') === 0 ? comment : comment.replace(/^\/\*!?/, '/*!')))
          .join('\n');
        if (header) file.code = `${header}\n${file.code}`;
      }
    },
  };
}
