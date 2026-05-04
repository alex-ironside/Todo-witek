import { describe, it, expect, vi, beforeEach } from 'vitest';

const collection = vi.fn();
const doc = vi.fn();
const setDoc = vi.fn();
const deleteDoc = vi.fn();
const getDoc = vi.fn();

vi.mock('firebase/firestore', () => ({
  collection: (...a: unknown[]) => collection(...a),
  doc: (...a: unknown[]) => doc(...a),
  setDoc: (...a: unknown[]) => setDoc(...a),
  deleteDoc: (...a: unknown[]) => deleteDoc(...a),
  getDoc: (...a: unknown[]) => getDoc(...a),
}));

vi.mock('./app', () => ({
  getDb: () => ({ __db: true }),
}));

const getFcmToken = vi.fn();
vi.mock('./messaging', () => ({
  getFcmToken: (...a: unknown[]) => getFcmToken(...a),
}));

// jsdom has no navigator.serviceWorker — must stub before module loads
const mockRegister = vi.fn();
const mockGetRegistration = vi.fn();
Object.defineProperty(globalThis.navigator, 'serviceWorker', {
  value: { register: mockRegister, getRegistration: mockGetRegistration },
  writable: true,
  configurable: true,
});

const importPushTokens = async () => await import('./pushTokens');

describe('pushTokens repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    collection.mockImplementation((_db: unknown, name: string) => ({ __col: name }));
    doc.mockImplementation((_db: unknown, col: string, id: string) => ({ __doc: `${col}/${id}` }));
    mockGetRegistration.mockResolvedValue(undefined);
  });

  it('registerCurrentDeviceForPush returns null when getFcmToken returns null', async () => {
    mockRegister.mockResolvedValue({});
    getFcmToken.mockResolvedValue(null);
    const { registerCurrentDeviceForPush } = await importPushTokens();
    const result = await registerCurrentDeviceForPush('user-1');
    expect(result).toBeNull();
    expect(setDoc).not.toHaveBeenCalled();
  });

  it('registerCurrentDeviceForPush saves token to Firestore and returns it', async () => {
    mockRegister.mockResolvedValue({ __reg: true });
    getFcmToken.mockResolvedValue('tok-abc');
    setDoc.mockResolvedValue(undefined);
    const { registerCurrentDeviceForPush } = await importPushTokens();
    const result = await registerCurrentDeviceForPush('user-1');
    expect(setDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ userId: 'user-1', token: 'tok-abc' })
    );
    expect(result).toBe('tok-abc');
  });

  it('unregisterDeviceToken deletes the token doc', async () => {
    deleteDoc.mockResolvedValue(undefined);
    const { unregisterDeviceToken } = await importPushTokens();
    await unregisterDeviceToken('tok-abc');
    expect(deleteDoc).toHaveBeenCalledOnce();
  });

  it('getCurrentDeviceToken returns null when token is not in Firestore', async () => {
    mockRegister.mockResolvedValue({ __reg: true });
    getFcmToken.mockResolvedValue('tok-xyz');
    getDoc.mockResolvedValue({ exists: () => false, data: () => undefined });
    const { getCurrentDeviceToken } = await importPushTokens();
    const result = await getCurrentDeviceToken('user-1');
    expect(result).toBeNull();
  });

  it('registers FCM SW under firebase-cloud-messaging-push-scope (distinct from workbox)', async () => {
    mockRegister.mockResolvedValue({ __reg: true });
    getFcmToken.mockResolvedValue('tok');
    setDoc.mockResolvedValue(undefined);
    const { registerCurrentDeviceForPush } = await importPushTokens();
    await registerCurrentDeviceForPush('u');
    expect(mockRegister).toHaveBeenCalledWith(
      expect.stringContaining('firebase-messaging-sw.js'),
      expect.objectContaining({ scope: expect.stringContaining('firebase-cloud-messaging-push-scope') })
    );
  });

  it('reuses an existing FCM SW registration instead of registering again', async () => {
    const existing = { __existing: true };
    mockGetRegistration.mockResolvedValue(existing);
    getFcmToken.mockResolvedValue('tok');
    setDoc.mockResolvedValue(undefined);
    const { registerCurrentDeviceForPush } = await importPushTokens();
    await registerCurrentDeviceForPush('u');
    expect(mockRegister).not.toHaveBeenCalled();
    expect(getFcmToken).toHaveBeenCalledWith(existing);
  });

  it('caches the FCM SW registration across calls (registers once)', async () => {
    mockRegister.mockResolvedValue({ __reg: true });
    getFcmToken.mockResolvedValue('tok-abc');
    setDoc.mockResolvedValue(undefined);
    getDoc.mockResolvedValue({ exists: () => true, data: () => ({ userId: 'u', token: 'tok-abc' }) });
    const { registerCurrentDeviceForPush, getCurrentDeviceToken } = await importPushTokens();
    await registerCurrentDeviceForPush('u');
    await getCurrentDeviceToken('u');
    await registerCurrentDeviceForPush('u');
    expect(mockRegister).toHaveBeenCalledTimes(1);
  });

  it('getCurrentDeviceToken returns token when Firestore doc exists for this user', async () => {
    mockRegister.mockResolvedValue({ __reg: true });
    getFcmToken.mockResolvedValue('tok-xyz');
    getDoc.mockResolvedValue({ exists: () => true, data: () => ({ userId: 'user-1', token: 'tok-xyz' }) });
    const { getCurrentDeviceToken } = await importPushTokens();
    const result = await getCurrentDeviceToken('user-1');
    expect(result).toBe('tok-xyz');
  });
});
