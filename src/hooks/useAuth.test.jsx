import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const observeAuth = vi.fn();
vi.mock('../firebase/auth.js', () => ({
  observeAuth: (...a) => observeAuth(...a),
}));

import { useAuth } from './useAuth.js';

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts as loading with no user', () => {
    observeAuth.mockReturnValue(() => {});
    const { result } = renderHook(() => useAuth());
    expect(result.current.loading).toBe(true);
    expect(result.current.user).toBeNull();
  });

  it('updates user when observeAuth fires', () => {
    let cb;
    observeAuth.mockImplementation((fn) => {
      cb = fn;
      return () => {};
    });
    const { result } = renderHook(() => useAuth());
    act(() => cb({ uid: 'u1', email: 'a@b.com' }));
    expect(result.current.user).toEqual({ uid: 'u1', email: 'a@b.com' });
    expect(result.current.loading).toBe(false);
  });

  it('unsubscribes on unmount', () => {
    const unsub = vi.fn();
    observeAuth.mockReturnValue(unsub);
    const { unmount } = renderHook(() => useAuth());
    unmount();
    expect(unsub).toHaveBeenCalled();
  });
});
