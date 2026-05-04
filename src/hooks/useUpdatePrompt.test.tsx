import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';

// Mock the vite-plugin-pwa virtual module. The real one is only available
// at build time inside the Vite pipeline; in unit tests we control the
// state and assert that the hook delegates correctly.
const mockUpdateServiceWorker = vi.fn();
let mockNeedRefresh = false;
const mockSetNeedRefresh = vi.fn();
let mockOptions: { onNeedRefresh?: () => void } | undefined;

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: (options?: { onNeedRefresh?: () => void }) => {
    mockOptions = options;
    return {
      needRefresh: [mockNeedRefresh, mockSetNeedRefresh] as const,
      offlineReady: [false, vi.fn()] as const,
      updateServiceWorker: mockUpdateServiceWorker,
    };
  },
}));

import { useUpdatePrompt } from './useUpdatePrompt';

describe('useUpdatePrompt', () => {
  beforeEach(() => {
    mockNeedRefresh = false;
    mockUpdateServiceWorker.mockReset().mockResolvedValue(undefined);
    mockSetNeedRefresh.mockReset();
    mockOptions = undefined;
  });

  it('reports needRefresh=false initially', () => {
    const { result } = renderHook(() => useUpdatePrompt());
    expect(result.current.needRefresh).toBe(false);
  });

  it('reports needRefresh=true when the SW signals a waiting update', () => {
    mockNeedRefresh = true;
    const { result } = renderHook(() => useUpdatePrompt());
    expect(result.current.needRefresh).toBe(true);
  });

  it('applyUpdate calls updateServiceWorker(true) to skipWaiting + reload', async () => {
    const { result } = renderHook(() => useUpdatePrompt());
    await act(async () => {
      await result.current.applyUpdate();
    });
    expect(mockUpdateServiceWorker).toHaveBeenCalledTimes(1);
    expect(mockUpdateServiceWorker).toHaveBeenCalledWith(true);
  });

  it('dismiss flips needRefresh back to false via the SW state setter', () => {
    mockNeedRefresh = true;
    const { result } = renderHook(() => useUpdatePrompt());
    act(() => {
      result.current.dismiss();
    });
    expect(mockSetNeedRefresh).toHaveBeenCalledWith(false);
  });

  it('passes an onNeedRefresh callback to useRegisterSW so the SW can wake the UI', () => {
    renderHook(() => useUpdatePrompt());
    expect(mockOptions).toBeDefined();
    expect(typeof mockOptions?.onNeedRefresh).toBe('function');
  });
});
