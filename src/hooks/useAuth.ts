import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { observeAuth } from '../firebase/auth';

export interface AuthState {
  user: User | null;
  loading: boolean;
}

export const useAuth = (): AuthState => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const off = observeAuth((u) => {
      setUser(u || null);
      setLoading(false);
    });
    return off;
  }, []);

  return { user, loading };
};
