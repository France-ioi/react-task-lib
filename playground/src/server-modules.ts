/** Stand-in for a task's local grader ("server-modules"), only bundled in client mode. */
export const LOCAL_GRADER_MARKER = 'local-grader-is-bundled';

export function grade(value: number): number {
  return value >= 3 ? 100 : value * 10;
}
