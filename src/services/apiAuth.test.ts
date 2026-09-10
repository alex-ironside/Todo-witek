import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiError } from './apiClient';

const { apiRequest } = vi.hoisted(() => ({ apiRequest: vi.fn() }));

vi.mock('./apiClient', async () => {
  const actual = await vi.importActual<typeof import('./apiClient')>('./apiClient');
  return { ...actual, apiRequest };
});

const importApiAuth = async () => await import('./apiAuth');

describe('apiAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('login posts credentials and returns the authenticated user', async () => {
    apiRequest.mockResolvedValue({ id: 'u1', email: 'a@b.com' });
    const { login } = await importApiAuth();

    const user = await login('a@b.com', 'secret');

    expect(apiRequest).toHaveBeenCalledWith('POST', '/auth/login', {
      email: 'a@b.com',
      password: 'secret',
    });
    expect(user).toEqual({ id: 'u1', email: 'a@b.com' });
  });

  it('logout posts to /auth/logout', async () => {
    apiRequest.mockResolvedValue(undefined);
    const { logout } = await importApiAuth();

    await logout();

    expect(apiRequest).toHaveBeenCalledWith('POST', '/auth/logout');
  });

  it('me returns the user when authenticated', async () => {
    apiRequest.mockResolvedValue({ id: 'u1', email: 'a@b.com' });
    const { me } = await importApiAuth();

    const user = await me();

    expect(apiRequest).toHaveBeenCalledWith('GET', '/auth/me');
    expect(user).toEqual({ id: 'u1', email: 'a@b.com' });
  });

  it('me returns null on a 401 permission-denied error', async () => {
    apiRequest.mockRejectedValue(new ApiError(401, 'permission-denied', 'unauthorized'));
    const { me } = await importApiAuth();

    const user = await me();

    expect(user).toBeNull();
  });

  it('me rethrows a non-auth error', async () => {
    apiRequest.mockRejectedValue(new ApiError(500, 'http-500', 'boom'));
    const { me } = await importApiAuth();

    await expect(me()).rejects.toThrow('boom');
  });

  it('me rethrows a non-ApiError failure (e.g. network error)', async () => {
    apiRequest.mockRejectedValue(new Error('network down'));
    const { me } = await importApiAuth();

    await expect(me()).rejects.toThrow('network down');
  });
});
