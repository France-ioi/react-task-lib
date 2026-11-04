/**
 * Page adjustments inherited from v3, for tasks embedded in the Bebras platform:
 * the task iframe takes the full width and scrolls (Safari: the container scrolls instead).
 * No-ops outside that context.
 */
export function applyBebrasLayout() {
  try {
    const iframe = window.parent.document.getElementById('question-iframe') as HTMLIFrameElement | null;
    const container = document.getElementById('container');
    if (!iframe || !container) return;
    iframe.style.width = '100%';
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    if (!isSafari) {
      iframe.setAttribute('scrolling', 'yes');
    } else {
      const fitHeight = () => {
        container.style.height = `${document.documentElement.clientHeight}px`;
      };
      container.style.overflowY = 'scroll';
      window.parent.addEventListener('resize', fitHeight);
      setTimeout(fitHeight, 1000);
    }
    document.body.style.width = '100%';
    container.className = 'container';
  } catch {
    // Cross-origin parent: not embedded in the Bebras platform.
  }
}

/** v3 behavior: a copy of #task is appended to the body (used by the Bebras platform). */
export function cloneTaskElement() {
  const task = document.getElementById('task');
  if (task) document.body.appendChild(task.cloneNode(true));
}
