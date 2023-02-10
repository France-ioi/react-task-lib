# react-task-lib

> Library to create France IOI tasks with React.js

## Install

```bash
yarn add @france-ioi/react-task-lib
```

To be able to download the library (because it is hosted on Github and not NPM), you have to setup your `~/.npmrc` file:

```
registry=https://registry.npmjs.org/
@france-ioi:registry=https://npm.pkg.github.com/
//npm.pkg.github.com/:_authToken=your_token
```

`your_token` has to be replaced by a Github token you have to generate here: https://github.com/settings/tokens/new
You have to check at least `read:packages` but you are also invited to check `write:packages` if you want to contribute to this library.


## Development

Use `yarn` to install dependencies.

Use `yarn watch` during development.

Use `yarn build` to build the library and `yarn publish` to publish a new version.
