import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Category } from '../types';

const apiRequest = vi.fn();

vi.mock('../services/apiClient', () => ({ apiRequest }));

const importApiCategoryRepo = async () => await import('./apiCategoryRepo');

const category = (overrides: Partial<Category>): Category => ({
  id: 'c1',
  ownerId: 'u1',
  name: 'Prywatne',
  ...overrides,
});

describe('apiCategoryRepo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('create posts the new category and returns its id', async () => {
    apiRequest.mockResolvedValue(category({ id: 'new-id' }));
    const { createApiCategoryRepo } = await importApiCategoryRepo();
    const repo = createApiCategoryRepo();

    const id = await repo.create({ name: 'Prywatne' });

    expect(apiRequest).toHaveBeenCalledWith('POST', '/categories', {
      name: 'Prywatne',
    });
    expect(id).toBe('new-id');
  });

  it('update patches the given fields', async () => {
    apiRequest.mockResolvedValue(category({}));
    const { createApiCategoryRepo } = await importApiCategoryRepo();
    const repo = createApiCategoryRepo();

    await repo.update('c1', { name: 'Renamed' });

    expect(apiRequest).toHaveBeenCalledWith('PATCH', '/categories/c1', {
      name: 'Renamed',
    });
  });

  it('delete sends a DELETE for the id and never throws (204 treated as success)', async () => {
    apiRequest.mockResolvedValue(undefined);
    const { createApiCategoryRepo } = await importApiCategoryRepo();
    const repo = createApiCategoryRepo();

    await expect(repo.delete('missing')).resolves.toBeUndefined();
    expect(apiRequest).toHaveBeenCalledWith('DELETE', '/categories/missing');
  });

  describe('observe', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('fetches immediately and sorts by position, missing position last', async () => {
      apiRequest.mockResolvedValue([
        category({ id: 'no-pos' }),
        category({ id: 'pos-2', position: 2 }),
        category({ id: 'pos-1', position: 1 }),
      ]);
      const { createApiCategoryRepo } = await importApiCategoryRepo();
      const repo = createApiCategoryRepo();
      const cb = vi.fn();

      repo.observe(cb);
      await vi.advanceTimersByTimeAsync(0);

      expect(cb).toHaveBeenCalledWith([
        expect.objectContaining({ id: 'pos-1' }),
        expect.objectContaining({ id: 'pos-2' }),
        expect.objectContaining({ id: 'no-pos' }),
      ]);
    });

    it('sorts a positioned category before a positionless one regardless of input order', async () => {
      apiRequest.mockResolvedValue([
        category({ id: 'with-pos', position: 1 }),
        category({ id: 'no-pos' }),
      ]);
      const { createApiCategoryRepo } = await importApiCategoryRepo();
      const repo = createApiCategoryRepo();
      const cb = vi.fn();

      repo.observe(cb);
      await vi.advanceTimersByTimeAsync(0);

      expect(cb).toHaveBeenCalledWith([
        expect.objectContaining({ id: 'with-pos' }),
        expect.objectContaining({ id: 'no-pos' }),
      ]);
    });

    it('sorts a positionless category after a positioned one when it comes first in the input', async () => {
      apiRequest.mockResolvedValue([
        category({ id: 'no-pos' }),
        category({ id: 'with-pos', position: 1 }),
      ]);
      const { createApiCategoryRepo } = await importApiCategoryRepo();
      const repo = createApiCategoryRepo();
      const cb = vi.fn();

      repo.observe(cb);
      await vi.advanceTimersByTimeAsync(0);

      expect(cb).toHaveBeenCalledWith([
        expect.objectContaining({ id: 'with-pos' }),
        expect.objectContaining({ id: 'no-pos' }),
      ]);
    });

    it('polls again after the interval elapses', async () => {
      apiRequest.mockResolvedValue([category({ id: 'c1' })]);
      const { createApiCategoryRepo } = await importApiCategoryRepo();
      const repo = createApiCategoryRepo();
      const cb = vi.fn();

      repo.observe(cb);
      await vi.advanceTimersByTimeAsync(0);
      expect(cb).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(5000);
      expect(cb).toHaveBeenCalledTimes(2);

      await vi.advanceTimersByTimeAsync(5000);
      expect(cb).toHaveBeenCalledTimes(3);
    });

    it('reports fetch failures via onError without throwing', async () => {
      apiRequest.mockRejectedValue(new Error('network down'));
      const { createApiCategoryRepo } = await importApiCategoryRepo();
      const repo = createApiCategoryRepo();
      const cb = vi.fn();
      const onError = vi.fn();

      repo.observe(cb, onError);
      await vi.advanceTimersByTimeAsync(0);

      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(expect.any(Error));
      expect(cb).not.toHaveBeenCalled();
    });

    it('swallows fetch failures silently when no onError is given', async () => {
      apiRequest.mockRejectedValue(new Error('network down'));
      const { createApiCategoryRepo } = await importApiCategoryRepo();
      const repo = createApiCategoryRepo();
      const cb = vi.fn();

      expect(() => repo.observe(cb)).not.toThrow();
      await vi.advanceTimersByTimeAsync(0);

      expect(cb).not.toHaveBeenCalled();
    });

    it('stops polling once unsubscribed', async () => {
      apiRequest.mockResolvedValue([category({ id: 'c1' })]);
      const { createApiCategoryRepo } = await importApiCategoryRepo();
      const repo = createApiCategoryRepo();
      const cb = vi.fn();

      const unsubscribe = repo.observe(cb);
      await vi.advanceTimersByTimeAsync(0);
      expect(cb).toHaveBeenCalledTimes(1);

      unsubscribe();
      await vi.advanceTimersByTimeAsync(20000);

      expect(cb).toHaveBeenCalledTimes(1);
    });

    it('drops the callback from a poll still in flight when unsubscribe runs', async () => {
      let resolveFetch!: (cats: Category[]) => void;
      apiRequest.mockReturnValueOnce(
        new Promise<Category[]>((resolve) => {
          resolveFetch = resolve;
        })
      );
      const { createApiCategoryRepo } = await importApiCategoryRepo();
      const repo = createApiCategoryRepo();
      const cb = vi.fn();
      const onError = vi.fn();

      const unsubscribe = repo.observe(cb, onError);
      unsubscribe();
      resolveFetch([category({ id: 'c1' })]);
      await vi.advanceTimersByTimeAsync(0);

      expect(cb).not.toHaveBeenCalled();
      expect(onError).not.toHaveBeenCalled();
    });

    it('drops onError from a poll still in flight when unsubscribe runs', async () => {
      let rejectFetch!: (err: Error) => void;
      apiRequest.mockReturnValueOnce(
        new Promise<Category[]>((_, reject) => {
          rejectFetch = reject;
        })
      );
      const { createApiCategoryRepo } = await importApiCategoryRepo();
      const repo = createApiCategoryRepo();
      const cb = vi.fn();
      const onError = vi.fn();

      const unsubscribe = repo.observe(cb, onError);
      unsubscribe();
      rejectFetch(new Error('late failure'));
      await vi.advanceTimersByTimeAsync(0);

      expect(onError).not.toHaveBeenCalled();
      expect(cb).not.toHaveBeenCalled();
    });

    it('skips an overlapping poll while a fetch is still in flight', async () => {
      let resolveFetch!: (cats: Category[]) => void;
      apiRequest.mockReturnValueOnce(
        new Promise<Category[]>((resolve) => {
          resolveFetch = resolve;
        })
      );
      const { createApiCategoryRepo } = await importApiCategoryRepo();
      const repo = createApiCategoryRepo();
      const cb = vi.fn();

      repo.observe(cb);
      await vi.advanceTimersByTimeAsync(5000);
      expect(apiRequest).toHaveBeenCalledTimes(1);

      resolveFetch([category({ id: 'c1' })]);
      await vi.advanceTimersByTimeAsync(0);
      expect(cb).toHaveBeenCalledTimes(1);
    });
  });
});
