import {describe, expectTypeOf, it} from 'vitest';
import {defineTask} from './mount';
import type {TaskData} from './types';

// A task's own types are plain interfaces, without index signatures.
interface MyVersion {
  version: string;
  hints: boolean;
  nbRows: number;
}
interface MyTaskData {
  version: MyVersion;
  secret: number[];
}
interface MyAnswer {
  cells: number[];
}

describe('public types', () => {
  it('accept task interfaces for taskData and answers', () => {
    const task = defineTask<MyAnswer, MyTaskData, {hint: string}, Record<string, never>>({
      metaData: {id: 'x'},
      defaultAnswer: (taskData) => ({cells: taskData.secret.map(() => 0)}),
      loadAnswer: (answer, {taskData, hints}) => {
        expectTypeOf(answer).toEqualTypeOf<MyAnswer>();
        expectTypeOf(taskData.version.nbRows).toEqualTypeOf<number>();
        expectTypeOf(hints).toEqualTypeOf<{hint: string}[]>();
      },
      getAnswer: () => ({cells: []}),
      getState: () => ({}),
      Workspace: () => null,
    });
    expectTypeOf<MyTaskData>().toExtend<TaskData>();
    expectTypeOf(task.defaultAnswer).returns.toEqualTypeOf<MyAnswer>();
  });
});
