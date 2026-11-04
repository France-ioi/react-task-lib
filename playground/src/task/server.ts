import type {ServerTask} from '@france-ioi/react-task-lib';

/** Local grader of the counter task: reach the target (version × 2) to score 100. */
export const counterGrader: ServerTask = {
  taskData({task}, callback) {
    const version = String(task.params['version'] ?? '1');
    callback(null, {version: {version}, target: Number(version) * 2});
  },
  gradeAnswer({answer}, taskData, callback) {
    const {target} = taskData as {target: number};
    const {value} = JSON.parse(String(answer.value)) as {value: number};
    const score = value === target ? 100 : Math.max(0, 100 - Math.abs(target - value) * 25);
    callback(null, {score, message: value === target ? 'Bravo !' : `Visez <b>${target}</b>.`});
  },
  requestHint({request}, callback) {
    callback(null, request);
  },
  taskHintData({task}, _taskData, callback) {
    callback(null, JSON.parse(String(task.hints_requested ?? '[]')));
  },
};
