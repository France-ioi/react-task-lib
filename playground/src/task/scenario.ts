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
  const errors: string[] = [];
  (window as unknown as {scenarioErrors: string[]}).scenarioErrors = errors;
  window.addEventListener('error', (event) => errors.push(String(event.message)));
  window.addEventListener('unhandledrejection', (event) => errors.push(`unhandled: ${String(event.reason)}`));
  const originalError = console.error;
  console.error = (...args: unknown[]) => {
    errors.push(args.map((a) => (a instanceof Error ? `${a.name}: ${a.message}` : String(a))).join(' '));
    originalError.apply(console, args);
  };
  const steps: {name: string; ok: boolean; detail: string}[] = [];
  const step = async (name: string, run: () => Promise<unknown>) => {
    try {
      await run();
      steps.push({name, ok: true, detail: ''});
    } catch (e) {
      const value = document.querySelector('[data-testid=value]')?.textContent;
      const result = document.querySelector('.fioi-result')?.textContent;
      const errors = (window as unknown as {scenarioErrors?: string[]}).scenarioErrors ?? [];
      steps.push({
        name,
        ok: false,
        detail: `${String(e)} | value=${value} result=${result} errors=${errors.join(' / ')}`,
      });
      throw e;
    }
  };
  try {
    await step('renders the workspace', () => until(() => document.querySelector('[data-testid=value]'), 'workspace'));
    await step('lays out tabs, blocks and buttons (flexbox)', async () => {
      const tabs = document.querySelectorAll<HTMLElement>('.fioi-version-tabs__tab');
      if (tabs.length !== 2) throw new Error(`${tabs.length} tabs`);
      const [a, b] = [tabs[0]!.getBoundingClientRect(), tabs[1]!.getBoundingClientRect()];
      if (Math.abs(a.top - b.top) > 3 || b.left <= a.right) throw new Error('tabs are not side by side');
      const buttons = document.querySelectorAll<HTMLElement>('.fioi-task-bar .fioi-button');
      const [v, r] = [buttons[0]!.getBoundingClientRect(), buttons[1]!.getBoundingClientRect()];
      if (Math.abs(v.top - r.top) > 3) throw new Error('task bar buttons are not on one row');
      const header = document.querySelector<HTMLElement>('.fioi-block__header')!.getBoundingClientRect();
      if (header.height < 40) throw new Error(`block header height ${header.height}`);
      const picker = document.querySelector<HTMLElement>('.fioi-number-picker')!.getBoundingClientRect();
      if (Math.round(picker.width) !== 100) throw new Error(`number picker width ${picker.width}`);
      const icon = document.querySelector('.fioi-instructions fontawesomeicon svg');
      if (!icon) throw new Error('instructions icon not rendered');
    });
    await step('opens the tutorial', async () => {
      byText('button', 'Lire les explications')!.click();
      await until(() => byText('.fioi-carousel h3', 'The counter'), 'tutorial slide');
      (document.querySelector('.fioi-carousel__control--next') as HTMLElement).click();
      await until(() => byText('.fioi-carousel h3', 'Validate'), 'second slide');
    });
    await step('solves level 1', async () => {
      // One click per task, like real clicks (React applies click updates in a microtask).
      byText('button', '+')!.click();
      await wait(0);
      byText('button', '+')!.click();
      await wait(0);
      byText('button', 'Valider')!.click();
      const dialog = await until(
        () => document.querySelector<HTMLElement>('.fioi-modal__dialog'),
        'next level proposal',
      );
      const box = dialog.getBoundingClientRect();
      const centered = Math.abs(box.left + box.width / 2 - window.innerWidth / 2) < 20;
      if (!centered) throw new Error('modal is not centered');
      await until(() => byText('.fioi-modal__dialog button', 'Passer à la suite'), 'next level button');
    });
    await step('opens level 2', async () => {
      byText('.fioi-modal__dialog button', 'Passer à la suite')!.click();
      await until(() => /Compteur — version 2/.test(document.body.textContent ?? ''), 'version 2');
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
