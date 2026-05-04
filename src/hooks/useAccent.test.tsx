import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { User } from 'firebase/auth';

const getCloudAccent = vi.fn();
const setCloudAccent = vi.fn();
vi.mock('../firebase/accent', () => ({
  getCloudAccent: (...a: unknown[]) => getCloudAccent(...a),
  setCloudAccent: (...a: unknown[]) => setCloudAccent(...a),
}));

let authCallback: ((u: User | null) => void) | null = null;
const observeAuth = vi.fn((cb: (u: User | null) => void) => {
  authCallback = cb;
  return () => {
    authCallback = null;
  };
});
vi.mock('../firebase/auth', () => ({
  observeAuth: (cb: (u: User | null) => void) => observeAuth(cb),
}));

let currentMode: 'local' | 'firebase' = 'local';
const onStorageModeChange = vi.fn((_cb: unknown) => () => {});
vi.mock('../services/storageMode', () => ({
  getStorageMode: () => currentMode,
  onStorageModeChange: (cb: unknown) => onStorageModeChange(cb),
}));

import { useAccent } from './useAccent';
import { ACCENT_STORAGE_KEY } from '../services/accent';
import { ACCENTS } from '../theme/accents';

const flush = () => act(() => Promise.resolve());

describe('useAccent', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    document.documentElement.removeAttribute('style');
    vi.clearAllMocks();
    authCallback = null;
    currentMode = 'local';
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns DEFAULT_ACCENT when localStorage is empty', () => {
    const { result } = renderHook(() => useAccent());
    expect(result.current[0]).toBe('amber');
  });

  it('seeds initial value from localStorage', () => {
    localStorage.setItem(ACCENT_STORAGE_KEY, 'rose');
    const { result } = renderHook(() => useAccent());
    expect(result.current[0]).toBe('rose');
  });

  it('setAccent updates the returned value and applies CSS variable', () => {
    const { result } = renderHook(() => useAccent());
    act(() => result.current[1]('mint'));
    expect(result.current[0]).toBe('mint');
    expect(
      document.documentElement.style.getPropertyValue('--color-accent')
    ).toBe(ACCENTS.mint.oklch);
  });

  it('subscribes to auth changes via observeAuth', () => {
    renderHook(() => useAccent());
    expect(observeAuth).toHaveBeenCalled();
  });

  it('does not call getCloudAccent in local mode', async () => {
    currentMode = 'local';
    renderHook(() => useAccent());
    await act(async () => {
      authCallback?.({ uid: 'user-1' } as User);
    });
    expect(getCloudAccent).not.toHaveBeenCalled();
  });

  it('cloud mode + signed-in: getCloudAccent called with uid', async () => {
    currentMode = 'firebase';
    getCloudAccent.mockResolvedValue(null);
    setCloudAccent.mockResolvedValue(undefined);
    renderHook(() => useAccent());
    await act(async () => {
      authCallback?.({ uid: 'user-1' } as User);
    });
    expect(getCloudAccent).toHaveBeenCalledWith('user-1');
  });

  it('cloud value present + differs from local: applies cloud and does NOT write back', async () => {
    currentMode = 'firebase';
    localStorage.setItem(ACCENT_STORAGE_KEY, 'amber');
    getCloudAccent.mockResolvedValue('mint');
    const { result } = renderHook(() => useAccent());
    await act(async () => {
      authCallback?.({ uid: 'user-1' } as User);
    });
    await flush();
    expect(result.current[0]).toBe('mint');
    await act(async () => {
      vi.advanceTimersByTime(500);
    });
    expect(setCloudAccent).not.toHaveBeenCalled();
  });

  it('cloud value missing: pushes local value up', async () => {
    currentMode = 'firebase';
    localStorage.setItem(ACCENT_STORAGE_KEY, 'rose');
    getCloudAccent.mockResolvedValue(null);
    setCloudAccent.mockResolvedValue(undefined);
    renderHook(() => useAccent());
    await act(async () => {
      authCallback?.({ uid: 'user-1' } as User);
    });
    await flush();
    expect(setCloudAccent).toHaveBeenCalledWith('user-1', 'rose');
  });

  it('cloud mode: setAccent debounces a single setCloudAccent after 250ms', async () => {
    currentMode = 'firebase';
    getCloudAccent.mockResolvedValue('amber');
    setCloudAccent.mockResolvedValue(undefined);
    const { result } = renderHook(() => useAccent());
    await act(async () => {
      authCallback?.({ uid: 'user-1' } as User);
    });
    await flush();
    setCloudAccent.mockClear();
    act(() => result.current[1]('sky'));
    expect(setCloudAccent).not.toHaveBeenCalled();
    await act(async () => {
      vi.advanceTimersByTime(250);
    });
    expect(setCloudAccent).toHaveBeenCalledTimes(1);
    expect(setCloudAccent).toHaveBeenCalledWith('user-1', 'sky');
  });

  it('local mode: setAccent never calls setCloudAccent even with auth user', async () => {
    currentMode = 'local';
    const { result } = renderHook(() => useAccent());
    await act(async () => {
      authCallback?.({ uid: 'user-1' } as User);
    });
    act(() => result.current[1]('violet'));
    await act(async () => {
      vi.advanceTimersByTime(500);
    });
    expect(setCloudAccent).not.toHaveBeenCalled();
  });
});
