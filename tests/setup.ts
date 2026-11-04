import {afterEach, vi} from 'vitest';
import {act} from '@testing-library/react';
import {cleanupPage} from './protocol/harness/page';

// jsdom does not implement scrolling
window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;

afterEach(() => {
  act(() => cleanupPage());
  vi.restoreAllMocks();
});
