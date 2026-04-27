import { describe, it, expect, vi, beforeEach } from 'vitest';

const collection = vi.fn();
const doc = vi.fn();
const setDoc = vi.fn();
const deleteDoc = vi.fn();

vi.mock('firebase/firestore', () => ({
  collection: (...a: unknown[]) => collection(...a),
  doc: (...a: unknown[]) => doc(...a),
  setDoc: (...a: unknown[]) => setDoc(...a),
  deleteDoc: (...a: unknown[]) => deleteDoc(...a),
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
Object.defineProperty(globalThis.navigator, 'serviceWorker', {
  value: { register: mockRegister },
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
});
