import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { User } from 'firebase/auth';

const observeAuth = vi.fn();
vi.mock('../firebase/auth', () => ({
  observeAuth: (...a: unknown[]) => observeAuth(...a),
}));

import { useAuth } from './useAuth';

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
    let cb: (u: User | null) => void = () => {};
    observeAuth.mockImplementation((fn: (u: User | null) => void) => {
      cb = fn;
      return () => {};
    });
    const { result } = renderHook(() => useAuth());
    act(() => cb({ uid: 'u1', email: 'a@b.com' } as User));
    expect(result.current.user?.uid).toBe('u1');
    expect(result.current.user?.email).toBe('a@b.com');
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
