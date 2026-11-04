/** Implementation-specific access to the lib's own UI (level tabs, grading result). */
export interface UiAccessors {
  tabs(): HTMLElement[];
  isActive(tab: HTMLElement): boolean;
  isLocked(tab: HTMLElement): boolean;
  /** Number of stars displayed in the tab. */
  stars(tab: HTMLElement): number;
  /** Container of the grading result (empty text when there is no result). */
  result(): HTMLElement;
}

const required = (element: HTMLElement | null, what: string): HTMLElement => {
  if (!element) throw new Error(`${what} not found`);
  return element;
};

export const uiV3: UiAccessors = {
  tabs: () => Array.from(document.querySelectorAll<HTMLElement>('.version-tabs [role=tab]')),
  isActive: (tab) => tab.className.includes('active'),
  isLocked: (tab) => tab.className.includes('is-locked'),
  stars: (tab) => tab.querySelectorAll('svg').length,
  result: () => required(document.querySelector<HTMLElement>('.result'), '.result'),
};

export const uiV4: UiAccessors = {
  tabs: () => Array.from(document.querySelectorAll<HTMLElement>('[role=tablist] [role=tab]')),
  isActive: (tab) => tab.getAttribute('aria-selected') === 'true',
  isLocked: (tab) => tab.getAttribute('aria-disabled') === 'true',
  stars: (tab) => tab.querySelectorAll('.fioi-stars svg').length,
  result: () => required(document.querySelector<HTMLElement>('.fioi-result'), '.fioi-result'),
};
