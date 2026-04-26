import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { usePwaInstall } from './usePwaInstall';

interface FakeEvent {
  preventDefault: () => void;
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const fireBeforeInstallPrompt = (overrides: Partial<FakeEvent> = {}): FakeEvent => {
  const event: FakeEvent = {
    preventDefault: vi.fn(),
    prompt: vi.fn().mockResolvedValue(undefined),
    userChoice: Promise.resolve({ outcome: 'accepted' }),
    ...overrides,
  };
  const e = new Event('beforeinstallprompt') as Event & FakeEvent;
  Object.assign(e, event);
  window.dispatchEvent(e);
  return event;
};

describe('usePwaInstall', () => {
  beforeEach(() => {
    // Reset listeners between tests by recreating the document; jsdom keeps
    // window listeners cross-test, but renderHook unmount removes ours.
  });

  it('starts with canInstall=false', () => {
    const { result } = renderHook(() => usePwaInstall());
    expect(result.current.canInstall).toBe(false);
  });

  it('captures beforeinstallprompt and exposes canInstall=true', () => {
    const { result } = renderHook(() => usePwaInstall());
    act(() => {
      fireBeforeInstallPrompt();
    });
    expect(result.current.canInstall).toBe(true);
  });

  it('promptInstall calls prompt() on the captured event', async () => {
    const { result } = renderHook(() => usePwaInstall());
    let captured: FakeEvent | null = null;
    act(() => {
      captured = fireBeforeInstallPrompt();
    });
    await act(async () => {
      await result.current.promptInstall();
    });
    expect(captured!.prompt).toHaveBeenCalled();
  });

  it('clears canInstall after the user accepts', async () => {
    const { result } = renderHook(() => usePwaInstall());
    act(() => {
      fireBeforeInstallPrompt({
        userChoice: Promise.resolve({ outcome: 'accepted' }),
      });
    });
    await act(async () => {
      await result.current.promptInstall();
    });
    expect(result.current.canInstall).toBe(false);
  });

  it('appinstalled event flips canInstall back to false', () => {
    const { result } = renderHook(() => usePwaInstall());
    act(() => {
      fireBeforeInstallPrompt();
    });
    expect(result.current.canInstall).toBe(true);
    act(() => {
      window.dispatchEvent(new Event('appinstalled'));
    });
    expect(result.current.canInstall).toBe(false);
  });
});

describe('usePwaInstall on iOS', () => {
  const setUserAgent = (ua: string) => {
    Object.defineProperty(navigator, 'userAgent', {
      value: ua,
      configurable: true,
    });
  };

  const setStandalone = (value: boolean) => {
    Object.defineProperty(navigator, 'standalone', {
      value,
      configurable: true,
    });
    window.matchMedia = vi.fn().mockReturnValue({
      matches: value,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }) as unknown as typeof window.matchMedia;
  };

  beforeEach(() => {
    setUserAgent(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15'
    );
    setStandalone(false);
  });

  it('reports isIos=true and canInstall=true when on iOS Safari and not installed', () => {
    const { result } = renderHook(() => usePwaInstall());
    expect(result.current.isIos).toBe(true);
    expect(result.current.canInstall).toBe(true);
  });

  it('reports canInstall=false when already installed (standalone)', () => {
    setStandalone(true);
    const { result } = renderHook(() => usePwaInstall());
    expect(result.current.isIos).toBe(true);
    expect(result.current.canInstall).toBe(false);
  });
});
