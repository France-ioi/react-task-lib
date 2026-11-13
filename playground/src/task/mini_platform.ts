/**
 * A compact stand-in for bebras miniPlatform.js (which needs jQuery and the bebras-modules):
 * same call sequence on initWithTask, same getTaskParams / validate / askHint behavior, and a
 * window.task_token. For the playground only.
 */
import {jwt, type PlatformApi, type TaskApi, type TaskParams} from '@france-ioi/react-task-lib';

class MiniTaskToken {
  data: Record<string, unknown>;
  constructor(data: Record<string, unknown>) {
    this.data = {...data, sHintsRequested: '[]'};
  }
  update(data: Record<string, unknown>) {
    Object.assign(this.data, data);
  }
  get(callback?: (token: string) => void) {
    const token = jwt.sign(this.data);
    if (callback) setTimeout(() => callback(token), 0);
    return token;
  }
  getAnswerToken(answer: string) {
    return jwt.sign({...this.data, sAnswer: answer});
  }
  addHintRequest(hintToken: string) {
    const hints = JSON.parse(this.data['sHintsRequested'] as string) as unknown[];
    hints.push(jwt.decode<{askedHint: unknown}>(hintToken).askedHint);
    this.data['sHintsRequested'] = JSON.stringify(hints);
    return this.get();
  }
}

export function installMiniPlatform(): PlatformApi {
  const query = new URLSearchParams(window.location.search);
  const taskToken = new MiniTaskToken({
    itemUrl: window.location.href,
    randomSeed: Number(query.get('randomSeed') ?? Math.floor(Math.random() * 10)),
  });
  (window as unknown as {task_token: MiniTaskToken}).task_token = taskToken;
  let task: TaskApi | null = null;

  const platform: PlatformApi = {
    initWithTask(newTask) {
      task = newTask;
      newTask.getMetaData((metaData) => {
        taskToken.update({id: metaData.id});
        newTask.updateToken(
          taskToken.get(),
          () =>
            newTask.load({task: true}, () => newTask.showViews({task: true}, () => {}, console.error), console.error),
          console.error,
        );
      }, console.error);
    },
    getTaskParams(_key, _default, success) {
      const params: TaskParams = {minScore: 0, maxScore: 40, noScore: 0, randomSeed: '0', options: {}};
      success(params);
    },
    askHint(hintToken, success) {
      const token = taskToken.addHintRequest(hintToken);
      task!.updateToken(token, () => success(token), console.error);
    },
    validate(_mode, success, error) {
      task!.getAnswer(
        (answer) =>
          task!.gradeAnswer(
            answer,
            taskToken.getAnswerToken(answer),
            () => success?.(),
            (message) => error?.(message),
          ),
        console.error,
      );
    },
    updateDisplay(_data, success) {
      success?.();
    },
  };
  (window as unknown as {platform: PlatformApi}).platform = platform;
  return platform;
}
