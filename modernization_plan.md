## Modernization Plan

We want to modernize this project. It was developed a long time ago and
follows very old principes (for example the linker/bundle system).

Here are our specs:
- modern libraries: React 18 or 19
- TypeScript and export clean types for all relevant objects
- modern bundler: Vite
- modern React code
- a modern CSS library: what do you recommend? Tailwind instead of Bootstrap?
- a modern state library: what do you recommend? Redux? Zustand?
- browser support: Safari 10.1 / Chrome 55 / Firefox 52 / Edge 15 (downgrade from Tailwind v4 for tasks using react-task-lib)
- keep exactly the same support of the task API methods (task.getAnswer, task.reloadAnswer, etc... and the same platform API platform.validate etc... because this is used to communicate with the platform)
- the task (e.g. circuit task) must be openable in files:// so ES modules look excluded to me as type="module" don't work with files

Feel free to make some recommendations other than those written here.
Feel free to rewrite the project from the bottom up as long as it works like before.

This lib was last used in this task: /home/sebastien/Documents/france-ioi/alkindi-task-circuit
You can refer to it for checking how it is used and testing that the new version still works.
You can update this project to check if it works. We just won't publish it.

Note that all the libs that use react-task-lib use a specific version of this lib.
Among the tasks, all the Alkindi tasks were for a specific date, their version
of react-task-lib will never be updated.
/home/sebastien/Documents/france-ioi/ai-tasks-tools uses react-task-lib too, but
it can be rewritten to work with the new react-task-lib interface.
In summary, do as if you were working on a new project, make choices as if.
You just have to provide the same functionalities, but the API can be different.
