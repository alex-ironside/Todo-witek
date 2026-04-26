import { useEffect, useState } from 'react';
import { observeAuth } from '../firebase/auth.js';

export const useAuth = () => {
  const [user, setUser] = useState(null);
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
