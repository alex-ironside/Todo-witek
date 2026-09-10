import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useApiAuth } from './useApiAuth';

const me = vi.fn();
const login = vi.fn();
const logout = vi.fn();

vi.mock('../services/apiAuth', () => ({
  me: (...a: unknown[]) => me(...a),
  login: (...a: unknown[]) => login(...a),
  logout: (...a: unknown[]) => logout(...a),
}));

describe('useApiAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sets the user and stops loading when me resolves a user', async () => {
    me.mockResolvedValue({ id: 'u1', email: 'a@b.com' });
    const { result } = renderHook(() => useApiAuth());

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.user).toEqual({ id: 'u1', email: 'a@b.com' });
  });

  it('sets user to null and stops loading when me resolves null', async () => {
    me.mockResolvedValue(null);
    const { result } = renderHook(() => useApiAuth());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toBeNull();
  });

  it('treats a non-401 me() rejection as logged-out instead of crashing', async () => {
    me.mockRejectedValue(new Error('network down'));
    const { result } = renderHook(() => useApiAuth());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toBeNull();
  });

  it('signIn logs in and sets the user', async () => {
    me.mockResolvedValue(null);
    login.mockResolvedValue({ id: 'u2', email: 'c@d.com' });
    const { result } = renderHook(() => useApiAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.signIn('c@d.com', 'pw');
    });

    expect(login).toHaveBeenCalledWith('c@d.com', 'pw');
    expect(result.current.user).toEqual({ id: 'u2', email: 'c@d.com' });
  });

  it('signIn propagates the login error and leaves the user null', async () => {
    me.mockResolvedValue(null);
    login.mockRejectedValue(new Error('bad-credentials'));
    const { result } = renderHook(() => useApiAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await expect(
      act(async () => {
        await result.current.signIn('c@d.com', 'wrong');
      })
    ).rejects.toThrow('bad-credentials');

    expect(result.current.user).toBeNull();
  });

  it('signOut logs out and clears the user', async () => {
    me.mockResolvedValue({ id: 'u1', email: 'a@b.com' });
    logout.mockResolvedValue(undefined);
    const { result } = renderHook(() => useApiAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).not.toBeNull();

    await act(async () => {
      await result.current.signOut();
    });

    expect(logout).toHaveBeenCalledTimes(1);
    expect(result.current.user).toBeNull();
  });

  it('signOut clears the user even when logout rejects', async () => {
    me.mockResolvedValue({ id: 'u1', email: 'a@b.com' });
    logout.mockRejectedValue(new Error('server down'));
    const { result } = renderHook(() => useApiAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.signOut();
    });

    expect(logout).toHaveBeenCalledTimes(1);
    expect(result.current.user).toBeNull();
  });
});
