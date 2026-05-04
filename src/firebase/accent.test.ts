import { describe, it, expect, vi, beforeEach } from 'vitest';

const doc = vi.fn();
const getDoc = vi.fn();
const setDoc = vi.fn();

vi.mock('firebase/firestore', () => ({
  doc: (...a: unknown[]) => doc(...a),
  getDoc: (...a: unknown[]) => getDoc(...a),
  setDoc: (...a: unknown[]) => setDoc(...a),
}));

vi.mock('./app', () => ({
  getDb: () => ({ __db: true }),
}));

const importAccent = async () => await import('./accent');

describe('firebase/accent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    doc.mockImplementation(
      (_db: unknown, ...path: string[]) => ({ __doc: path.join('/') })
    );
  });

  it('getCloudAccent reads users/{uid}/preferences/accent and returns value when valid', async () => {
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ value: 'rose' }),
    });
    const { getCloudAccent } = await importAccent();
    const result = await getCloudAccent('user-1');
    expect(doc).toHaveBeenCalledWith(
      { __db: true }, 'users', 'user-1', 'preferences', 'accent'
    );
    expect(result).toBe('rose');
  });

  it('getCloudAccent returns null when doc does not exist', async () => {
    getDoc.mockResolvedValue({ exists: () => false, data: () => ({}) });
    const { getCloudAccent } = await importAccent();
    expect(await getCloudAccent('user-1')).toBeNull();
  });

  it('getCloudAccent returns null when stored value is not an AccentKey', async () => {
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ value: 'fuchsia' }),
    });
    const { getCloudAccent } = await importAccent();
    expect(await getCloudAccent('user-1')).toBeNull();
  });

  it('getCloudAccent returns null when value field is missing', async () => {
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({}),
    });
    const { getCloudAccent } = await importAccent();
    expect(await getCloudAccent('user-1')).toBeNull();
  });

  it('setCloudAccent writes { value } to users/{uid}/preferences/accent', async () => {
    setDoc.mockResolvedValue(undefined);
    const { setCloudAccent } = await importAccent();
    await setCloudAccent('user-1', 'mint');
    expect(doc).toHaveBeenCalledWith(
      { __db: true }, 'users', 'user-1', 'preferences', 'accent'
    );
    expect(setDoc).toHaveBeenCalledWith(
      { __doc: 'users/user-1/preferences/accent' },
      { value: 'mint' }
    );
  });
});
