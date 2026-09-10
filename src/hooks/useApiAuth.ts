import { useEffect, useState } from 'react';
import { login, logout, me, type AuthUser } from '../services/apiAuth';

export interface ApiAuthState {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useApiAuth = (): ApiAuthState => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    me()
      .then((u) => {
        if (!cancelled) setUser(u);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = async (email: string, password: string): Promise<void> => {
    const u = await login(email, password);
    setUser(u);
  };

  const signOut = async (): Promise<void> => {
    try {
      await logout();
    } catch {
    } finally {
      setUser(null);
    }
  };

  return { user, loading, signIn, signOut };
};
