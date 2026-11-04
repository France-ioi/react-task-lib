# Checking the old browsers

The supported browsers are Safari 10.1 / iOS 10.3, Chrome 55, Firefox 52 and Edge 15
(`browserslist` in package.json). There is no BrowserStack, so support relies on:

| Gate | What | When |
|---|---|---|
| `pnpm check:compat` | built bundles parse as ES2017, no trailing comma before `)` | CI |
| `eslint-plugin-compat` | Web APIs used in sources exist or are polyfilled | CI (`pnpm lint`) |
| stylelint `no-unsupported-browser-features` | CSS features (flex `gap`, grid…) | CI (`pnpm lint`) |
| Playwright, `file://` | Chromium, Firefox, WebKit (current versions) | CI (`pnpm test:e2e`) |
| **Firefox 52 ESR** (real engine) | `scripts/old-browsers-smoke.mjs` | manually, before releases |
| **V8 5.5** = Chrome 55's engine | `scripts/v8-probes.mjs` | manually, before releases |

Safari 10.1 and Edge 15 have no runnable engine on Linux: they are covered by the gates only.

Build first: `pnpm build && pnpm playground:build`.

## Firefox 52 ESR

```sh
mkdir -p ~/old-browsers && cd ~/old-browsers
curl -L https://ftp.mozilla.org/pub/firefox/releases/52.9.0esr/linux-x86_64/en-US/firefox-52.9.0esr.tar.bz2 | tar xj
mkdir -p ff52-profile
echo 'user_pref("browser.shell.checkDefaultBrowser", false); user_pref("app.update.enabled", false);' > ff52-profile/user.js
cd -  # back to react-task-lib
MOZ_ENABLE_WAYLAND=0 node scripts/old-browsers-smoke.mjs ~/old-browsers/firefox/firefox -no-remote -profile ~/old-browsers/ff52-profile
```

It opens `playground/index.html`, `index.client.html` and `task.html` from `file://` (a window
appears briefly) and prints the results reported by each page; `task.html` plays the counter task
by script (solve level 1, open level 2, ask a hint).

## Chrome 55 (V8 5.5)

Chromium 55 snapshots (revision 423768) need `libgconf-2-4` and then segfault on current
Ubuntu, so the JavaScript engine is checked through Node 7.10.1, which embeds V8 5.5 (Chrome 55):

```sh
cd ~/old-browsers && curl -L https://nodejs.org/dist/v7.10.1/node-v7.10.1-linux-x64.tar.xz | tar xJ
cd -
node scripts/v8-probes.mjs ~/old-browsers/node-v7.10.1-linux-x64/bin/node
```

It syntax-checks the playground bundles with V8 5.5 and runs the probes (syntax lowering and
polyfills) on it. DOM behavior of Chrome 55 itself is not covered.

## Results

| Date | Commit | Firefox 52.9 ESR | V8 5.5 (Chrome 55) |
|---|---|---|---|
| 2026-11-04 | Phase 1 | ✓ 16/16 probes, server + client, `file://` | ✓ bundles parse, 16/16 probes |
| 2026-11-04 | Phase 2 | ✓ probes + counter task played end to end (validate, next level, hint) | ✓ 3 bundles parse, 16/16 probes |
