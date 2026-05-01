import { describe, it, expect, vi, beforeEach } from 'vitest';

const signInWithEmailAndPassword = vi.fn();
const signOut = vi.fn();
const onAuthStateChanged = vi.fn();
const sendPasswordResetEmail = vi.fn();

vi.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: (...args: unknown[]) =>
    signInWithEmailAndPassword(...args),
  signOut: (...args: unknown[]) => signOut(...args),
  onAuthStateChanged: (...args: unknown[]) => onAuthStateChanged(...args),
  sendPasswordResetEmail: (...args: unknown[]) =>
    sendPasswordResetEmail(...args),
}));

vi.mock('./app', () => ({
  getFirebaseAuth: () => ({ __auth: true }),
}));

const importAuth = async () => await import('./auth');

describe('auth wrapper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('login delegates to signInWithEmailAndPassword with auth instance', async () => {
    signInWithEmailAndPassword.mockResolvedValue({ user: { uid: 'u1' } });
    const { login } = await importAuth();
    const res = await login('a@b.com', 'pw');
    expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
      { __auth: true },
      'a@b.com',
      'pw'
    );
    expect(res.user.uid).toBe('u1');
  });

  it('logout delegates to signOut with auth instance', async () => {
    signOut.mockResolvedValue(undefined);
    const { logout } = await importAuth();
    await logout();
    expect(signOut).toHaveBeenCalledWith({ __auth: true });
  });

  it('observeAuth subscribes via onAuthStateChanged', async () => {
    const unsub = vi.fn();
    onAuthStateChanged.mockReturnValue(unsub);
    const { observeAuth } = await importAuth();
    const cb = vi.fn();
    const off = observeAuth(cb);
    expect(onAuthStateChanged).toHaveBeenCalledWith({ __auth: true }, cb);
    expect(off).toBe(unsub);
  });

  it('resetPassword delegates to sendPasswordResetEmail with auth instance', async () => {
    sendPasswordResetEmail.mockResolvedValue(undefined);
    const { resetPassword } = await importAuth();
    await resetPassword('a@b.com');
    expect(sendPasswordResetEmail).toHaveBeenCalledWith(
      { __auth: true },
      'a@b.com'
    );
  });

  it('resetPassword propagates errors from the SDK', async () => {
    sendPasswordResetEmail.mockRejectedValue(new Error('user-not-found'));
    const { resetPassword } = await importAuth();
    await expect(resetPassword('missing@b.com')).rejects.toThrow(
      'user-not-found'
    );
  });
});
