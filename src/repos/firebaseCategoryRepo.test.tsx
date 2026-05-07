import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// In-memory Firestore-shaped store so we can exercise the real
// firebaseCategoryRepo + observeUserCategories + useCategories together
// without any real network. Hoisted via vi.hoisted because vi.mock's
// factory runs before module-level consts initialise.
const fb = vi.hoisted(() => {
  type Doc = Record<string, unknown> & { ownerId: string };
  const store = new Map<string, Doc>();
  const listeners: {
    ownerId: string;
    next: (snap: { docs: { id: string; data: () => Doc }[] }) => void;
  }[] = [];
  let nextAutoId = 0;
  const newAutoId = () => `auto-${++nextAutoId}`;
  const fireSnapshots = () => {
    for (const l of listeners) {
      const docs = Array.from(store.entries())
        .filter(([, data]) => data.ownerId === l.ownerId)
        .map(([id, data]) => ({ id, data: () => data }));
      l.next({ docs });
    }
  };
  const reset = () => {
    store.clear();
    listeners.length = 0;
    nextAutoId = 0;
  };
  return { store, listeners, newAutoId, fireSnapshots, reset };
});

vi.mock('firebase/firestore', () => {
  return {
    collection: (_db: unknown, name: string) => ({ __col: name }),
    doc: (_db: unknown, col: string, id: string) => ({
      __doc: `${col}/${id}`,
    }),
    addDoc: async (_col: unknown, data: Record<string, unknown>) => {
      const id = fb.newAutoId();
      fb.store.set(id, { ...data } as never);
      fb.fireSnapshots();
      return { id };
    },
    updateDoc: async (
      ref: { __doc: string },
      fields: Record<string, unknown>
    ) => {
      const id = ref.__doc.split('/')[1];
      const existing = fb.store.get(id);
      if (!existing) throw new Error(`No doc at ${ref.__doc}`);
      fb.store.set(id, { ...existing, ...fields } as never);
      fb.fireSnapshots();
    },
    deleteDoc: async (ref: { __doc: string }) => {
      const id = ref.__doc.split('/')[1];
      fb.store.delete(id);
      fb.fireSnapshots();
    },
    onSnapshot: (
      q: { __query: unknown[] },
      next: (snap: { docs: { id: string; data: () => unknown }[] }) => void
    ) => {
      const where = q.__query.find(
        (a): a is { __where: [string, string, string] } =>
          typeof a === 'object' && a !== null && '__where' in (a as object)
      );
      const ownerId = where ? (where.__where[2] as string) : '';
      const listener = { ownerId, next };
      fb.listeners.push(listener);
      // Mirror Firestore's "fire an initial empty snapshot when there's
      // nothing in the cache" behaviour, but do it asynchronously.
      Promise.resolve().then(() => fb.fireSnapshots());
      return () => {
        const idx = fb.listeners.indexOf(listener);
        if (idx >= 0) fb.listeners.splice(idx, 1);
      };
    },
    query: (...args: unknown[]) => ({ __query: args }),
    where: (field: string, op: string, val: unknown) => ({
      __where: [field, op, val],
    }),
    serverTimestamp: () => '__SERVER_TS__',
  };
});

vi.mock('../firebase/app', () => ({
  getDb: () => ({ __db: true }),
}));

import { createFirebaseCategoryRepo } from './firebaseCategoryRepo';
import { useCategories } from '../hooks/useCategories';

beforeEach(() => {
  fb.reset();
  vi.clearAllMocks();
});

describe('useCategories × firebaseCategoryRepo (Firestore SDK mocked)', () => {
  it('seeds Prywatne and Służbowe in order on first connect for a fresh user', async () => {
    const repo = createFirebaseCategoryRepo('user-1');
    const { result } = renderHook(() => useCategories(repo));
    await waitFor(() => {
      expect(result.current.categories.map((c) => c.name)).toEqual([
        'Prywatne',
        'Służbowe',
      ]);
    });
    for (const c of result.current.categories) {
      expect(c.ownerId).toBe('user-1');
    }
  });

  it('does not duplicate seeds when the snapshot keeps firing while the seed is in flight', async () => {
    // Real Firestore replays the snapshot more than once during the
    // initial connection (cache → server). The in-flight seed guard
    // must keep the seed from running twice and creating duplicate
    // Prywatne / Służbowe docs.
    const repo = createFirebaseCategoryRepo('user-1');
    renderHook(() => useCategories(repo));
    // Replay extra empty snapshots while the seed is racing.
    fb.fireSnapshots();
    fb.fireSnapshots();
    await waitFor(() => {
      const docs = Array.from(fb.store.values()).filter(
        (d) => d.ownerId === 'user-1'
      );
      expect(docs).toHaveLength(2);
      expect(docs.map((d) => d.name as string).sort()).toEqual([
        'Prywatne',
        'Służbowe',
      ]);
    });
  });

  it('a category added via repo.create appears as the LAST item, after the seeds', async () => {
    const repo = createFirebaseCategoryRepo('user-1');
    const { result } = renderHook(() => useCategories(repo));
    await waitFor(() => {
      expect(result.current.categories).toHaveLength(2);
    });
    await act(async () => {
      await repo.create({ name: 'Hobby' });
    });
    await waitFor(() => {
      expect(result.current.categories.map((c) => c.name)).toEqual([
        'Prywatne',
        'Służbowe',
        'Hobby',
      ]);
    });
  });

  it('observe filters by ownerId — another user\'s docs do not leak in', async () => {
    fb.store.set('foreign', {
      ownerId: 'user-2',
      name: 'NIE POKAZUJ',
      position: 1,
    });
    const repo = createFirebaseCategoryRepo('user-1');
    const { result } = renderHook(() => useCategories(repo));
    await waitFor(() => {
      expect(result.current.categories.map((c) => c.name)).toEqual([
        'Prywatne',
        'Służbowe',
      ]);
    });
    expect(
      result.current.categories.some((c) => c.name === 'NIE POKAZUJ')
    ).toBe(false);
  });
});
