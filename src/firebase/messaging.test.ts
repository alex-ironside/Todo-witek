import { describe, it, expect, vi, beforeEach } from 'vitest';

const isSupported = vi.fn();
const getMessaging = vi.fn();
const getToken = vi.fn();
const onMessage = vi.fn();

vi.mock('firebase/messaging', () => ({
  isSupported: () => isSupported(),
  getMessaging: (...a: unknown[]) => getMessaging(...a),
  getToken: (...a: unknown[]) => getToken(...a),
  onMessage: (...a: unknown[]) => onMessage(...a),
}));

vi.mock('./app', () => ({
  getFirebaseApp: () => ({ __app: true }),
}));

vi.mock('./config', () => ({
  vapidKey: 'test-vapid-key',
}));

const importMessaging = async () => await import('./messaging');

describe('messaging wrapper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('getFcmToken returns null when FCM not supported', async () => {
    isSupported.mockResolvedValue(false);
    const { getFcmToken } = await importMessaging();
    const result = await getFcmToken({} as ServiceWorkerRegistration);
    expect(result).toBeNull();
  });

  it('getFcmToken calls getToken with vapidKey and serviceWorkerRegistration when supported', async () => {
    isSupported.mockResolvedValue(true);
    getMessaging.mockReturnValue({ __messaging: true });
    getToken.mockResolvedValue('tok-123');
    const { getFcmToken } = await importMessaging();
    const reg = {} as ServiceWorkerRegistration;
    const result = await getFcmToken(reg);
    expect(getToken).toHaveBeenCalledWith(
      { __messaging: true },
      { vapidKey: 'test-vapid-key', serviceWorkerRegistration: reg }
    );
    expect(result).toBe('tok-123');
  });

  it('onForegroundMessage returns a noop function when FCM not supported', async () => {
    isSupported.mockResolvedValue(false);
    const { onForegroundMessage } = await importMessaging();
    const handler = vi.fn();
    const result = await onForegroundMessage(handler);
    expect(typeof result).toBe('function');
  });

  it('onForegroundMessage subscribes via onMessage and returns the unsubscribe function', async () => {
    isSupported.mockResolvedValue(true);
    getMessaging.mockReturnValue({ __messaging: true });
    const mockUnsub = vi.fn();
    onMessage.mockReturnValue(mockUnsub);
    const { onForegroundMessage } = await importMessaging();
    const handler = vi.fn();
    const result = await onForegroundMessage(handler);
    expect(onMessage).toHaveBeenCalledWith({ __messaging: true }, handler);
    expect(result).toBe(mockUnsub);
  });
});
