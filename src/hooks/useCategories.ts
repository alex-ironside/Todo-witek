import { useEffect, useRef, useState } from 'react';
import {
  SEED_CATEGORIES,
  type Category,
  type CategoryRepository,
} from '../types';

export interface CategoriesState {
  categories: Category[];
  loading: boolean;
  error: Error | null;
}

// Subscribes to the user's categories. The first time the snapshot
// reports an empty list, we seed the built-in defaults so existing
// todos with category='prywatne'/'sluzbowe' keep a real category.
export const useCategories = (
  repo: CategoryRepository | null
): CategoriesState => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const seedingRef = useRef(false);

  useEffect(() => {
    if (!repo) {
      setCategories([]);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    seedingRef.current = false;

    const off = repo.observe(
      (next) => {
        setCategories(next);
        setLoading(false);
        if (next.length === 0 && !seedingRef.current) {
          seedingRef.current = true;
          // Defer the seed creates so they run AFTER repo.observe()
          // finishes wiring up its change listener. The local repo
          // dispatches its change event synchronously inside create();
          // if we seeded inside this initial callback, those events would
          // fire before the listener was registered and React state would
          // stay empty even though the seeds landed in storage.
          queueMicrotask(() => {
            void Promise.all(
              SEED_CATEGORIES.map((seed) =>
                repo.create({ id: seed.id, name: seed.name })
              )
            ).catch((e) => {
              seedingRef.current = false;
              console.error('[categories] seed failed', e);
            });
          });
        }
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );
    return off;
  }, [repo]);

  return { categories, loading, error };
};
