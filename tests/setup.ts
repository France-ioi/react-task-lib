import {afterEach, vi} from 'vitest';
import {act} from '@testing-library/react';
import {cleanupPage} from './protocol/harness/page';

const isBrowserLike = typeof window !== 'undefined';

if (isBrowserLike) {
  // jsdom does not implement scrolling
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
}

afterEach(() => {
  if (isBrowserLike) act(() => cleanupPage());
  vi.restoreAllMocks();
});
