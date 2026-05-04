import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNow } from './useNow';

describe('useNow', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(1_700_000_000_000));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initial value matches Date.now()', () => {
    const { result } = renderHook(() => useNow());
    expect(result.current).toBe(1_700_000_000_000);
  });

  it('re-renders with a new timestamp after the interval elapses', () => {
    const { result } = renderHook(() => useNow(30_000));
    const initial = result.current;
    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    expect(result.current).toBe(initial + 30_000);
  });

  it('stops ticking after unmount', () => {
    const { result, unmount } = renderHook(() => useNow(30_000));
    const captured = result.current;
    unmount();
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(result.current).toBe(captured);
  });
});
