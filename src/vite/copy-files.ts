import {cpSync, existsSync} from 'node:fs';
import path from 'node:path';
import type {Plugin} from 'vite';

export interface CopyFilesOptions {
  root: string;
  outDir: string;
  /** HTML page copied as `<outDir>/index.html`. */
  page?: string;
  /** Files or folders copied into outDir, keeping their relative path (e.g. 'bebras-modules', 'assets'). */
  copy?: string[];
}

/**
 * Makes the output folder deployable as is: the task page and its static files next to the
 * bundle (like webpack's HtmlWebpackPlugin + CopyWebpackPlugin in v3 tasks).
 */
export function copyFiles({root, outDir, page, copy = []}: CopyFilesOptions): Plugin {
  return {
    name: 'fioi:copy-files',
    apply: 'build',
    writeBundle() {
      const out = path.resolve(root, outDir);
      if (page) cpSync(path.resolve(root, page), path.join(out, 'index.html'));
      for (const entry of copy) {
        const source = path.resolve(root, entry);
        if (!existsSync(source)) {
          this.warn(`copy: ${entry} does not exist`);
          continue;
        }
        cpSync(source, path.join(out, entry), {recursive: true, dereference: true});
      }
    },
  };
}
