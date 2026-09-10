import { apiRequest, ApiError } from './apiClient';

export interface AuthUser {
  id: string;
  email: string;
}

export const login = (email: string, password: string): Promise<AuthUser> =>
  apiRequest<AuthUser>('POST', '/auth/login', { email, password });

export const logout = (): Promise<void> => apiRequest<void>('POST', '/auth/logout');

export const me = async (): Promise<AuthUser | null> => {
  try {
    return await apiRequest<AuthUser>('GET', '/auth/me');
  } catch (err) {
    if (err instanceof ApiError && err.code === 'permission-denied') return null;
    throw err;
  }
};
