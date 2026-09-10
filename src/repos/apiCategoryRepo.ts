import { apiRequest } from '../services/apiClient';
import type {
  Category,
  CategoryRepository,
  CategoryUpdate,
  NewCategory,
  Unsubscribe,
} from '../types';

const POLL_MS = 5000;

const sortByPosition = (cats: Category[]): Category[] =>
  cats.slice().sort((a, b) => {
    const pa = a.position ?? Number.POSITIVE_INFINITY;
    const pb = b.position ?? Number.POSITIVE_INFINITY;
    return pa - pb;
  });

export const createApiCategoryRepo = (): CategoryRepository => ({
  create: async (input: NewCategory): Promise<string> => {
    const cat = await apiRequest<Category>('POST', '/categories', input);
    return cat.id;
  },

  update: (id: string, fields: CategoryUpdate): Promise<void> =>
    apiRequest<void>('PATCH', `/categories/${id}`, fields),

  delete: (id: string): Promise<void> =>
    apiRequest<void>('DELETE', `/categories/${id}`),

  observe: (
    callback: (cats: Category[]) => void,
    onError?: (err: Error) => void
  ): Unsubscribe => {
    let cancelled = false;
    let inFlight = false;
    const poll = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const cats = await apiRequest<Category[]>('GET', '/categories');
        if (!cancelled) callback(sortByPosition(cats));
      } catch (err) {
        if (!cancelled) onError?.(err as Error);
      } finally {
        inFlight = false;
      }
    };
    void poll();
    const intervalId = window.setInterval(() => {
      void poll();
    }, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  },
});
