import {defineTaskConfig} from '@france-ioi/react-task-lib/vite';

/** The sample counter task (client mode: local grader bundled). */
export default defineTaskConfig({entry: 'src/task/index.tsx', mode: 'client', outDir: 'build-task'});
