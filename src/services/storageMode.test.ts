import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  STORAGE_MODE_KEY,
  getStorageMode,
  setStorageMode,
  onStorageModeChange,
} from './storageMode';

describe('storageMode', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults to local when nothing is set', () => {
    expect(getStorageMode()).toBe('local');
  });

  it('reads firebase when set', () => {
    localStorage.setItem(STORAGE_MODE_KEY, 'firebase');
    expect(getStorageMode()).toBe('firebase');
  });

  it('falls back to local for unrecognized values', () => {
    localStorage.setItem(STORAGE_MODE_KEY, 'garbage');
    expect(getStorageMode()).toBe('local');
  });

  it('setStorageMode persists the value', () => {
    setStorageMode('firebase');
    expect(localStorage.getItem(STORAGE_MODE_KEY)).toBe('firebase');
    setStorageMode('local');
    expect(localStorage.getItem(STORAGE_MODE_KEY)).toBe('local');
  });

  it('onStorageModeChange fires on setStorageMode in same tab', () => {
    const cb = vi.fn();
    const off = onStorageModeChange(cb);
    setStorageMode('firebase');
    expect(cb).toHaveBeenCalledWith('firebase');
    off();
  });

  it('onStorageModeChange unsubscribes', () => {
    const cb = vi.fn();
    const off = onStorageModeChange(cb);
    off();
    setStorageMode('firebase');
    expect(cb).not.toHaveBeenCalled();
  });
});
