import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useCategories } from './useCategories';
import {
  createLocalCategoryRepo,
  LOCAL_CATEGORIES_KEY,
} from '../repos/localCategoryRepo';
import type { Category, CategoryRepository } from '../types';

function makeRepo(initial: Category[] = []): {
  repo: CategoryRepository;
  emit: (cats: Category[]) => void;
  emitError: (err: Error) => void;
  createSpy: ReturnType<typeof vi.fn>;
} {
  const listeners: {
    next: (c: Category[]) => void;
    err?: (e: Error) => void;
  }[] = [];
  let store = [...initial];
  const createSpy = vi.fn(async ({ id, name }: { id?: string; name: string }) => {
    const finalId = id ?? `gen-${store.length}`;
    store = [...store, { id: finalId, ownerId: 'u', name }];
    listeners.forEach((l) => l.next(store));
    return finalId;
  });
  const repo: CategoryRepository = {
    create: createSpy,
    update: vi.fn(async () => undefined),
    delete: vi.fn(async () => undefined),
    observe: (next, err) => {
      listeners.push({ next, err });
      next(store);
      return () => {
        const idx = listeners.findIndex((l) => l.next === next);
        if (idx >= 0) listeners.splice(idx, 1);
      };
    },
  };
  return {
    repo,
    emit: (cats) => {
      store = cats;
      listeners.forEach((l) => l.next(cats));
    },
    emitError: (e) => listeners.forEach((l) => l.err?.(e)),
    createSpy,
  };
}

describe('useCategories', () => {
  it('returns the observed categories', async () => {
    const { repo } = makeRepo([
      { id: 'a', ownerId: 'u', name: 'Apple' },
      { id: 'b', ownerId: 'u', name: 'Banana' },
    ]);
    const { result } = renderHook(() => useCategories(repo));
    await waitFor(() => {
      expect(result.current.categories.map((c) => c.name)).toEqual([
        'Apple',
        'Banana',
      ]);
      expect(result.current.loading).toBe(false);
    });
  });

  it('seeds prywatne and sluzbowe when the repo starts empty', async () => {
    const { repo, createSpy } = makeRepo([]);
    renderHook(() => useCategories(repo));
    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith({
        id: 'prywatne',
        name: 'Prywatne',
      });
      expect(createSpy).toHaveBeenCalledWith({
        id: 'sluzbowe',
        name: 'Służbowe',
      });
    });
  });

  it('does not re-seed when categories already exist', async () => {
    const { repo, createSpy } = makeRepo([
      { id: 'prywatne', ownerId: 'u', name: 'Prywatne' },
    ]);
    renderHook(() => useCategories(repo));
    await new Promise((r) => setTimeout(r, 10));
    expect(createSpy).not.toHaveBeenCalled();
  });

  it('re-seeds when categories drop back to empty after the first seed', async () => {
    const { repo, emit, createSpy } = makeRepo([]);
    renderHook(() => useCategories(repo));
    // Wait for the initial seed to land.
    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledTimes(2);
    });
    createSpy.mockClear();
    // Simulate categories being deleted (e.g. on another device).
    act(() => {
      emit([]);
    });
    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith({
        id: 'prywatne',
        name: 'Prywatne',
      });
      expect(createSpy).toHaveBeenCalledWith({
        id: 'sluzbowe',
        name: 'Służbowe',
      });
    });
  });

  it('passes errors through', async () => {
    const { repo, emitError } = makeRepo([]);
    const { result } = renderHook(() => useCategories(repo));
    const err = new Error('boom');
    act(() => {
      emitError(err);
    });
    await waitFor(() => {
      expect(result.current.error).toBe(err);
    });
  });

  it('handles a null repo gracefully', () => {
    const { result } = renderHook(() => useCategories(null));
    expect(result.current.categories).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  describe('against the real local repo', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it('shows the seeded prywatne and sluzbowe in state on first run', async () => {
      const repo = createLocalCategoryRepo();
      const { result } = renderHook(() => useCategories(repo));
      await waitFor(() => {
        expect(result.current.categories.map((c) => c.id).sort()).toEqual([
          'prywatne',
          'sluzbowe',
        ]);
      });
    });

    it('keeps the seeded categories when the user adds a new one', async () => {
      const repo = createLocalCategoryRepo();
      const { result } = renderHook(() => useCategories(repo));
      await waitFor(() => {
        expect(result.current.categories.map((c) => c.id).sort()).toEqual([
          'prywatne',
          'sluzbowe',
        ]);
      });
      await act(async () => {
        await repo.create({ name: 'Hobby' });
      });
      await waitFor(() => {
        expect(result.current.categories.map((c) => c.name).sort()).toEqual([
          'Hobby',
          'Prywatne',
          'Służbowe',
        ]);
      });
      const stored = JSON.parse(
        localStorage.getItem(LOCAL_CATEGORIES_KEY) || '[]'
      ) as Category[];
      expect(stored.map((c) => c.id).sort()).toEqual(
        expect.arrayContaining(['prywatne', 'sluzbowe'])
      );
    });
  });
});
