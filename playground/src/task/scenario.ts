/**
 * `?report=<url>`: plays the task automatically (solve level 1, open level 2, ask a hint) and sends
 * the outcome to <url> — used by scripts/old-browsers-smoke.mjs on real old browsers.
 */
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function until<T>(read: () => T | null | undefined | false, what: string, timeout = 10000): Promise<T> {
  const start = Date.now();
  for (;;) {
    const value = read();
    if (value) return value;
    if (Date.now() - start > timeout) throw new Error(`timeout: ${what}`);
    await wait(50);
  }
}

const byText = (selector: string, text: string) =>
  Array.prototype.slice
    .call(document.querySelectorAll<HTMLElement>(selector))
    .find((element: HTMLElement) => (element.textContent ?? '').trim() === text) as HTMLElement | undefined;

export async function runScenario() {
  const target = new URLSearchParams(window.location.search).get('report');
  if (!target) return;
  const steps: {name: string; ok: boolean; detail: string}[] = [];
  const step = async (name: string, run: () => Promise<unknown>) => {
    try {
      await run();
      steps.push({name, ok: true, detail: ''});
    } catch (e) {
      steps.push({name, ok: false, detail: String(e)});
      throw e;
    }
  };
  try {
    await step('renders the workspace', () => until(() => document.querySelector('[data-testid=value]'), 'workspace'));
    await step('solves level 1', async () => {
      byText('button', '+')!.click();
      byText('button', '+')!.click();
      byText('button', 'Valider')!.click();
      await until(() => byText('.fioi-modal__dialog button', 'Passer à la suite'), 'next level proposal');
    });
    await step('opens level 2', async () => {
      byText('.fioi-modal__dialog button', 'Passer à la suite')!.click();
      await until(() => /Version 2/.test(document.body.textContent ?? ''), 'version 2');
    });
    await step('grants a hint', async () => {
      byText('button', 'Hint')!.click();
      await until(() => document.querySelector('[data-testid=hint]'), 'hint');
    });
  } catch {
    // reported below
  }
  const payload = JSON.stringify({
    userAgent: navigator.userAgent,
    mode: 'task',
    grader: 'local',
    results: steps,
  });
  new Image().src = `${target}?data=${encodeURIComponent(payload)}`;
}
