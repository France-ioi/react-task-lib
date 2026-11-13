# react-task-lib

> Library to create France-IOI tasks with React.

## Install

The package is hosted on GitHub Packages. Set up `~/.npmrc`:

```
registry=https://registry.npmjs.org/
@france-ioi:registry=https://npm.pkg.github.com/
//npm.pkg.github.com/:_authToken=your_token
```

`your_token` is a GitHub token (https://github.com/settings/tokens/new) with at least
`read:packages` (`write:packages` to publish).

## Usage

See the [task author guide](docs/task-authoring.md): project setup with the shared Vite
configuration, task definition, hooks and components, browser rules, migration from v3.

Supported browsers: Safari 10.1 / iOS 10.3, Chrome 55, Firefox 52, Edge 15 (`browserslist` in
package.json). See [docs/old-browsers.md](docs/old-browsers.md).

## Development

Requires Node ≥ 20.19 and pnpm (`corepack enable`).

```sh
pnpm install
pnpm test               # unit + protocol tests (Vitest)
pnpm lint               # ESLint (incl. browser API compat) + stylelint (CSS compat)
pnpm typecheck
pnpm build              # dist/
pnpm playground:build   # playground/build*/ — open playground/index.html from the file system
pnpm playground:dev     # Vite dev server
pnpm check:compat       # ES2017 / Chrome 55 syntax gate on the built bundles
pnpm test:e2e           # Playwright, file:// (Chromium, Firefox, WebKit)
pnpm ci                 # everything, as in GitHub Actions
```

Local tasks can use the working copy with
`"@france-ioi/react-task-lib": "link:../react-task-lib"`.
