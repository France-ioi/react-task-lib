/**
 * Syntax and API probes: each one uses features that the supported browsers (Safari 10.1,
 * Chrome 55, Firefox 52, Edge 15) lack natively, and that the build must lower or polyfill.
 */
export interface Probe {
  name: string;
  run: () => unknown | Promise<unknown>;
  expected: unknown;
}

class Counter {
  static created = 0;
  #count = 0;
  label = 'counter';

  increment() {
    this.#count++;
    Counter.created++;
    return this.#count;
  }
}

async function* countTo(n: number) {
  for (let i = 1; i <= n; i++) {
    yield i;
  }
}

export const probes: Probe[] = [
  {
    name: 'object spread / rest',
    run: () => {
      const {a, ...rest} = {a: 1, b: 2, c: 3};
      return {...rest, a};
    },
    expected: {b: 2, c: 3, a: 1},
  },
  {
    name: 'optional chaining / nullish',
    run: () => {
      const value: {deep?: {x?: number}} | undefined = {deep: {}};
      return [value?.deep?.x ?? 'default', (undefined as {x: number} | undefined)?.x];
    },
    expected: ['default', undefined],
  },
  {
    name: 'class fields (public, static, private)',
    run: () => {
      const counter = new Counter();
      counter.increment();
      return [counter.increment(), counter.label];
    },
    expected: [2, 'counter'],
  },
  {
    name: 'async / await',
    run: async () => {
      const value = await Promise.resolve(41);
      return value + 1;
    },
    expected: 42,
  },
  {
    name: 'for await / async generators',
    run: async () => {
      const values: number[] = [];
      for await (const value of countTo(3)) values.push(value);
      return values;
    },
    expected: [1, 2, 3],
  },
  {name: 'trailing commas in calls', run: () => Math.max(1, 2), expected: 2},
  {name: 'exponent operator', run: () => 2 ** 10, expected: 1024},
  {
    name: 'Promise.prototype.finally',
    run: async () => {
      let finallyCalled = false;
      await Promise.resolve().finally(() => (finallyCalled = true));
      return finallyCalled;
    },
    expected: true,
  },
  {
    name: 'Promise.allSettled',
    run: async () =>
      (await Promise.allSettled([Promise.resolve(1), Promise.reject(new Error('x'))])).map((r) => r.status),
    expected: ['fulfilled', 'rejected'],
  },
  {
    name: 'Object.fromEntries / entries',
    run: () => Object.fromEntries(Object.entries({a: 1}).map(([k, v]) => [k, v + 1])),
    expected: {a: 2},
  },
  {
    name: 'Array.prototype.flat / flatMap / includes',
    run: () =>
      [[1, [2]], [3]]
        .flat(2)
        .flatMap((x) => [x])
        .includes(3),
    expected: true,
  },
  {
    name: 'String.prototype.padStart / replaceAll',
    run: () => '7'.padStart(3, '0').replaceAll('0', '-'),
    expected: '--7',
  },
  {name: 'Array.prototype.at', run: () => [1, 2, 3].at(-1), expected: 3},
  {name: 'URLSearchParams', run: () => new URLSearchParams('?taskID=t&version=2').get('version'), expected: '2'},
  {name: 'globalThis', run: () => typeof globalThis.setTimeout, expected: 'function'},
  {name: 'queueMicrotask', run: () => new Promise((resolve) => queueMicrotask(() => resolve('ok'))), expected: 'ok'},
];

export async function runProbes(): Promise<{name: string; ok: boolean; detail: string}[]> {
  const results = [];
  for (const probe of probes) {
    try {
      const value = await probe.run();
      const ok = JSON.stringify(value) === JSON.stringify(probe.expected);
      results.push({name: probe.name, ok, detail: ok ? '' : `got ${JSON.stringify(value)}`});
    } catch (e) {
      results.push({name: probe.name, ok: false, detail: String(e)});
    }
  }
  return results;
}
