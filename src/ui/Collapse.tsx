import {useLayoutEffect, useRef, type ReactNode} from 'react';

const DURATION_MS = 300;

/**
 * Shows/hides its content with a height transition (content stays mounted, like v3's collapse).
 * Hidden content gets `display: none` once collapsed.
 */
export function Collapse({open, children, id}: {open: boolean; children: ReactNode; id?: string}) {
  const ref = useRef<HTMLDivElement>(null);
  // Last `open` value applied to the DOM: only a real change animates. A "first render" flag
  // is not enough, as StrictMode runs effects twice on mount and the ref survives in between.
  const appliedOpen = useRef<boolean | null>(null);

  useLayoutEffect(() => {
    const element = ref.current!;
    if (appliedOpen.current === null || appliedOpen.current === open) {
      appliedOpen.current = open;
      element.style.display = open ? '' : 'none';
      return undefined;
    }
    appliedOpen.current = open;

    element.style.display = '';
    element.style.overflow = 'hidden';
    const fullHeight = element.scrollHeight;
    element.style.height = `${open ? 0 : fullHeight}px`;
    // Force a reflow so that the browser transitions from the start height.
    void element.offsetHeight;
    element.classList.add('fioi-collapse--animating');
    element.style.height = `${open ? fullHeight : 0}px`;

    const finish = () => {
      element.classList.remove('fioi-collapse--animating');
      element.style.height = '';
      element.style.overflow = '';
      if (!open) element.style.display = 'none';
    };
    // transitionend is not reliable (no transition when hidden, reduced motion, jsdom): use a timer.
    const timer = setTimeout(finish, DURATION_MS);
    return () => {
      clearTimeout(timer);
      finish();
    };
  }, [open]);

  return (
    <div ref={ref} id={id} className="fioi-collapse" aria-hidden={!open}>
      {children}
    </div>
  );
}
