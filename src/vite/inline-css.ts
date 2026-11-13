import type {Plugin} from 'vite';

/**
 * Moves the CSS emitted by the build into the JS bundle, injected as a <style> element when the
 * script runs. A task is then a single classic script, openable from file://.
 */
export function inlineCss(): Plugin {
  return {
    name: 'fioi:inline-css',
    apply: 'build',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const cssAssets = Object.values(bundle).filter((file) => file.type === 'asset' && file.fileName.endsWith('.css'));
      if (!cssAssets.length) return;
      const css = cssAssets.map((asset) => (asset.type === 'asset' ? String(asset.source) : '')).join('\n');
      for (const asset of cssAssets) delete bundle[asset.fileName];

      const entry = Object.values(bundle).find((file) => file.type === 'chunk' && file.isEntry);
      if (!entry || entry.type !== 'chunk') {
        this.error('fioi:inline-css: no entry chunk to inject the CSS into');
      }
      const injection =
        `(function(){if(typeof document==='undefined')return;` +
        `var s=document.createElement('style');s.setAttribute('data-fioi-task','');` +
        `s.appendChild(document.createTextNode(${JSON.stringify(css)}));` +
        `document.head.appendChild(s);})();\n`;
      entry.code = injection + entry.code;
    },
  };
}
