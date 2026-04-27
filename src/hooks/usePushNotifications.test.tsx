import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Stub Notification before any module loads
Object.defineProperty(globalThis, 'Notification', {
  value: { permission: 'default', requestPermission: vi.fn() },
  configurable: true,
  writable: true,
});

// Mock dependencies at module boundary
const mockRegisterCurrentDeviceForPush = vi.fn();
const mockUnregisterDeviceToken = vi.fn();
const mockGetCurrentDeviceToken = vi.fn();
vi.mock('../firebase/pushTokens', () => ({
  registerCurrentDeviceForPush: (...a: unknown[]) => mockRegisterCurrentDeviceForPush(...a),
  unregisterDeviceToken: (...a: unknown[]) => mockUnregisterDeviceToken(...a),
  getCurrentDeviceToken: (...a: unknown[]) => mockGetCurrentDeviceToken(...a),
}));

const mockOnForegroundMessage = vi.fn();
vi.mock('../firebase/messaging', () => ({
  onForegroundMessage: (...a: unknown[]) => mockOnForegroundMessage(...a),
}));

const mockRequestPermission = vi.fn();
vi.mock('../services/notificationService', () => ({
  requestNotificationPermission: (...a: unknown[]) => mockRequestPermission(...a),
}));

let mockVapidKey = 'test-vapid-key';
vi.mock('../firebase/config', () => ({
  get vapidKey() { return mockVapidKey; },
}));

const importHook = async () => {
  const mod = await import('./usePushNotifications');
  return mod;
};

describe('usePushNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    // Re-define Notification fully in case test 2 deleted it
    Object.defineProperty(globalThis, 'Notification', {
      value: { permission: 'default', requestPermission: vi.fn() },
      configurable: true,
      writable: true,
    });
    mockVapidKey = 'test-vapid-key';
    mockOnForegroundMessage.mockResolvedValue(() => {});
  });

  afterEach(() => {
    // Restore Notification if a test deleted it
    if (!('Notification' in globalThis)) {
      Object.defineProperty(globalThis, 'Notification', {
        value: { permission: 'default', requestPermission: vi.fn() },
        configurable: true,
        writable: true,
      });
    }
  });

  // Mount initialisation tests

  it('status is unconfigured when vapidKey is empty', async () => {
    mockVapidKey = '';
    const { usePushNotifications } = await importHook();
    const { result } = renderHook(() => usePushNotifications('user-1'));
    await act(async () => {});
    expect(result.current.status).toBe('unconfigured');
  });

  it('status is unsupported when Notification is not in window', async () => {
    // Remove Notification from globalThis
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'Notification');
    delete (globalThis as Record<string, unknown>).Notification;
    const { usePushNotifications } = await importHook();
    const { result } = renderHook(() => usePushNotifications('user-1'));
    await act(async () => {});
    expect(result.current.status).toBe('unsupported');
    // Restore for afterEach
    if (descriptor) {
      Object.defineProperty(globalThis, 'Notification', descriptor);
    }
  });

  it('status is denied when Notification.permission is denied', async () => {
    Object.defineProperty(globalThis, 'Notification', {
      value: { permission: 'denied' },
      configurable: true,
      writable: true,
    });
    const { usePushNotifications } = await importHook();
    const { result } = renderHook(() => usePushNotifications('user-1'));
    await act(async () => {});
    expect(result.current.status).toBe('denied');
  });

  it('status is enabled on mount when permission is granted and getCurrentDeviceToken returns a token', async () => {
    Object.defineProperty(globalThis, 'Notification', {
      value: { permission: 'granted' },
      configurable: true,
      writable: true,
    });
    mockGetCurrentDeviceToken.mockResolvedValue('tok-abc');
    const { usePushNotifications } = await importHook();
    const { result } = renderHook(() => usePushNotifications('user-1'));
    await act(async () => {});
    expect(result.current.status).toBe('enabled');
    expect(result.current.token).toBe('tok-abc');
  });

  it('status is idle on mount when permission is granted and getCurrentDeviceToken returns null', async () => {
    Object.defineProperty(globalThis, 'Notification', {
      value: { permission: 'granted' },
      configurable: true,
      writable: true,
    });
    mockGetCurrentDeviceToken.mockResolvedValue(null);
    const { usePushNotifications } = await importHook();
    const { result } = renderHook(() => usePushNotifications('user-1'));
    await act(async () => {});
    expect(result.current.status).toBe('idle');
  });

  // enable() action tests

  it('enable() transitions idle to enabled after permission granted and registerCurrentDeviceForPush succeeds', async () => {
    mockRequestPermission.mockResolvedValue('granted');
    mockRegisterCurrentDeviceForPush.mockResolvedValue('tok-new');
    const { usePushNotifications } = await importHook();
    const { result } = renderHook(() => usePushNotifications('user-1'));
    await act(async () => {});
    await act(async () => { await result.current.enable(); });
    expect(result.current.status).toBe('enabled');
    expect(result.current.token).toBe('tok-new');
  });

  it('enable() transitions to denied when permission is denied', async () => {
    mockRequestPermission.mockResolvedValue('denied');
    const { usePushNotifications } = await importHook();
    const { result } = renderHook(() => usePushNotifications('user-1'));
    await act(async () => { await result.current.enable(); });
    expect(result.current.status).toBe('denied');
  });

  it('enable() sets error status when registerCurrentDeviceForPush throws', async () => {
    mockRequestPermission.mockResolvedValue('granted');
    mockRegisterCurrentDeviceForPush.mockRejectedValue(new Error('FCM failed'));
    const { usePushNotifications } = await importHook();
    const { result } = renderHook(() => usePushNotifications('user-1'));
    await act(async () => { await result.current.enable(); });
    expect(result.current.status).toBe('error');
    expect(result.current.errorMessage).toBe('FCM failed');
  });

  // disable() action test

  it('disable() calls unregisterDeviceToken and transitions to disabled', async () => {
    Object.defineProperty(globalThis, 'Notification', {
      value: { permission: 'granted' },
      configurable: true,
      writable: true,
    });
    mockGetCurrentDeviceToken.mockResolvedValue('tok-abc');
    mockUnregisterDeviceToken.mockResolvedValue(undefined);
    const { usePushNotifications } = await importHook();
    const { result } = renderHook(() => usePushNotifications('user-1'));
    await act(async () => {});
    expect(result.current.status).toBe('enabled');
    await act(async () => { await result.current.disable(); });
    expect(mockUnregisterDeviceToken).toHaveBeenCalledWith('tok-abc');
    expect(result.current.status).toBe('disabled');
  });

  // Banner tests

  it('bannerMessage is set when onForegroundMessage callback fires', async () => {
    mockOnForegroundMessage.mockImplementation(async (handler: (payload: { notification?: { title?: string } }) => void) => {
      handler({ notification: { title: 'Test push!' } });
      return () => {};
    });
    const { usePushNotifications } = await importHook();
    const { result } = renderHook(() => usePushNotifications('user-1'));
    await act(async () => {});
    expect(result.current.bannerMessage).toBe('Test push!');
  });

  it('bannerMessage auto-dismisses after 5 seconds', async () => {
    mockOnForegroundMessage.mockImplementation(async (handler: (payload: { notification?: { title?: string } }) => void) => {
      handler({ notification: { title: 'Test push!' } });
      return () => {};
    });
    vi.useFakeTimers();
    const { usePushNotifications } = await importHook();
    const { result } = renderHook(() => usePushNotifications('user-1'));
    await act(async () => {});
    expect(result.current.bannerMessage).toBe('Test push!');
    act(() => { vi.advanceTimersByTime(5000); });
    expect(result.current.bannerMessage).toBeNull();
    vi.useRealTimers();
  });

  // Cleanup test — cancelled flag pattern

  it('onForegroundMessage unsub is called when promise resolves after unmount (cancelled flag)', async () => {
    let resolveUnsub!: (unsub: () => void) => void;
    const subPromise = new Promise<() => void>((r) => { resolveUnsub = r; });
    mockOnForegroundMessage.mockReturnValue(subPromise);
    const { usePushNotifications } = await importHook();
    const unsubMock = vi.fn();
    const { unmount } = renderHook(() => usePushNotifications('user-1'));
    await act(async () => {}); // let mount effect run; promise not yet resolved
    unmount(); // sets cancelled = true, unsub = noop
    await act(async () => { resolveUnsub(unsubMock); }); // promise resolves after unmount
    expect(unsubMock).toHaveBeenCalled(); // cancelled branch calls off() immediately
  });
});
