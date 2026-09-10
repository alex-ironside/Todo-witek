import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Todo } from '../types';

const apiRequest = vi.fn();

vi.mock('../services/apiClient', () => ({ apiRequest }));

const importApiTodoRepo = async () => await import('./apiTodoRepo');

const todo = (overrides: Partial<Todo>): Todo => ({
  id: 't1',
  ownerId: 'u1',
  title: 'Buy milk',
  done: false,
  reminders: [],
  ...overrides,
});

describe('apiTodoRepo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('create posts the new todo and returns its id', async () => {
    apiRequest.mockResolvedValue(todo({ id: 'new-id' }));
    const { createApiTodoRepo } = await importApiTodoRepo();
    const repo = createApiTodoRepo();

    const id = await repo.create({ title: 'Buy milk', reminders: [] });

    expect(apiRequest).toHaveBeenCalledWith('POST', '/todos', {
      title: 'Buy milk',
      reminders: [],
    });
    expect(id).toBe('new-id');
  });

  it('update patches the given fields', async () => {
    apiRequest.mockResolvedValue(todo({}));
    const { createApiTodoRepo } = await importApiTodoRepo();
    const repo = createApiTodoRepo();

    await repo.update('t1', { title: 'New title' });

    expect(apiRequest).toHaveBeenCalledWith('PATCH', '/todos/t1', {
      title: 'New title',
    });
  });

  it('toggleDone patches only the done flag', async () => {
    apiRequest.mockResolvedValue(todo({}));
    const { createApiTodoRepo } = await importApiTodoRepo();
    const repo = createApiTodoRepo();

    await repo.toggleDone('t1', true);

    expect(apiRequest).toHaveBeenCalledWith('PATCH', '/todos/t1', { done: true });
  });

  it('delete sends a DELETE for the id', async () => {
    apiRequest.mockResolvedValue(undefined);
    const { createApiTodoRepo } = await importApiTodoRepo();
    const repo = createApiTodoRepo();

    await repo.delete('t1');

    expect(apiRequest).toHaveBeenCalledWith('DELETE', '/todos/t1');
  });

  it('reorder posts the ordered id list', async () => {
    apiRequest.mockResolvedValue(undefined);
    const { createApiTodoRepo } = await importApiTodoRepo();
    const repo = createApiTodoRepo();

    await repo.reorder(['a', 'b']);

    expect(apiRequest).toHaveBeenCalledWith('POST', '/todos/reorder', {
      orderedIds: ['a', 'b'],
    });
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
        todo({ id: 'no-pos' }),
        todo({ id: 'pos-2', position: 2 }),
        todo({ id: 'pos-1', position: 1 }),
      ]);
      const { createApiTodoRepo } = await importApiTodoRepo();
      const repo = createApiTodoRepo();
      const cb = vi.fn();

      repo.observe(cb);
      await vi.advanceTimersByTimeAsync(0);

      expect(cb).toHaveBeenCalledWith([
        expect.objectContaining({ id: 'pos-1' }),
        expect.objectContaining({ id: 'pos-2' }),
        expect.objectContaining({ id: 'no-pos' }),
      ]);
    });

    it('sorts a positioned todo before a positionless one regardless of input order', async () => {
      apiRequest.mockResolvedValue([
        todo({ id: 'with-pos', position: 1 }),
        todo({ id: 'no-pos' }),
      ]);
      const { createApiTodoRepo } = await importApiTodoRepo();
      const repo = createApiTodoRepo();
      const cb = vi.fn();

      repo.observe(cb);
      await vi.advanceTimersByTimeAsync(0);

      expect(cb).toHaveBeenCalledWith([
        expect.objectContaining({ id: 'with-pos' }),
        expect.objectContaining({ id: 'no-pos' }),
      ]);
    });

    it('sorts a positionless todo after a positioned one when it comes first in the input', async () => {
      apiRequest.mockResolvedValue([
        todo({ id: 'no-pos' }),
        todo({ id: 'with-pos', position: 1 }),
      ]);
      const { createApiTodoRepo } = await importApiTodoRepo();
      const repo = createApiTodoRepo();
      const cb = vi.fn();

      repo.observe(cb);
      await vi.advanceTimersByTimeAsync(0);

      expect(cb).toHaveBeenCalledWith([
        expect.objectContaining({ id: 'with-pos' }),
        expect.objectContaining({ id: 'no-pos' }),
      ]);
    });

    it('polls again after the interval elapses', async () => {
      apiRequest.mockResolvedValue([todo({ id: 't1' })]);
      const { createApiTodoRepo } = await importApiTodoRepo();
      const repo = createApiTodoRepo();
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
      const { createApiTodoRepo } = await importApiTodoRepo();
      const repo = createApiTodoRepo();
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
      const { createApiTodoRepo } = await importApiTodoRepo();
      const repo = createApiTodoRepo();
      const cb = vi.fn();

      expect(() => repo.observe(cb)).not.toThrow();
      await vi.advanceTimersByTimeAsync(0);

      expect(cb).not.toHaveBeenCalled();
    });

    it('stops polling once unsubscribed', async () => {
      apiRequest.mockResolvedValue([todo({ id: 't1' })]);
      const { createApiTodoRepo } = await importApiTodoRepo();
      const repo = createApiTodoRepo();
      const cb = vi.fn();

      const unsubscribe = repo.observe(cb);
      await vi.advanceTimersByTimeAsync(0);
      expect(cb).toHaveBeenCalledTimes(1);

      unsubscribe();
      await vi.advanceTimersByTimeAsync(20000);

      expect(cb).toHaveBeenCalledTimes(1);
    });

    it('drops the callback from a poll still in flight when unsubscribe runs', async () => {
      let resolveFetch!: (todos: Todo[]) => void;
      apiRequest.mockReturnValueOnce(
        new Promise<Todo[]>((resolve) => {
          resolveFetch = resolve;
        })
      );
      const { createApiTodoRepo } = await importApiTodoRepo();
      const repo = createApiTodoRepo();
      const cb = vi.fn();
      const onError = vi.fn();

      const unsubscribe = repo.observe(cb, onError);
      unsubscribe();
      resolveFetch([todo({ id: 't1' })]);
      await vi.advanceTimersByTimeAsync(0);

      expect(cb).not.toHaveBeenCalled();
      expect(onError).not.toHaveBeenCalled();
    });

    it('drops onError from a poll still in flight when unsubscribe runs', async () => {
      let rejectFetch!: (err: Error) => void;
      apiRequest.mockReturnValueOnce(
        new Promise<Todo[]>((_, reject) => {
          rejectFetch = reject;
        })
      );
      const { createApiTodoRepo } = await importApiTodoRepo();
      const repo = createApiTodoRepo();
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
      let resolveFetch!: (todos: Todo[]) => void;
      apiRequest.mockReturnValueOnce(
        new Promise<Todo[]>((resolve) => {
          resolveFetch = resolve;
        })
      );
      const { createApiTodoRepo } = await importApiTodoRepo();
      const repo = createApiTodoRepo();
      const cb = vi.fn();

      repo.observe(cb);
      await vi.advanceTimersByTimeAsync(5000);
      expect(apiRequest).toHaveBeenCalledTimes(1);

      resolveFetch([todo({ id: 't1' })]);
      await vi.advanceTimersByTimeAsync(0);
      expect(cb).toHaveBeenCalledTimes(1);
    });
  });
});
