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
          queueMicrotask(async () => {
            // Seed sequentially: parallel creates can race on the
            // position field — both Promise.all branches read the same
            // "next position" before either has written, ending up with
            // identical positions and an undefined-order tab bar.
            // Awaiting each create ensures the second seed sees the
            // first one's position and lands strictly after it.
            //
            // Clearing the in-flight flag once seeding settles lets a
            // later empty observation (e.g. categories deleted on
            // another device) trigger a fresh seed rather than leaving
            // the user permanently without categories.
            try {
              for (const seed of SEED_CATEGORIES) {
                await repo.create({ id: seed.id, name: seed.name });
              }
            } catch (e) {
              console.error('[categories] seed failed', e);
            } finally {
              seedingRef.current = false;
            }
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
