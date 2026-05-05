import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useLocalTodoTransfer } from './useLocalTodoTransfer';
import { LOCAL_TODOS_KEY } from '../repos/localTodoRepo';
import type { Todo, TodoRepository } from '../types';

const makeRepo = (): TodoRepository => ({
  create: vi.fn().mockResolvedValue('new-id'),
  update: vi.fn().mockResolvedValue(undefined),
  toggleDone: vi.fn().mockResolvedValue(undefined),
  delete: vi.fn().mockResolvedValue(undefined),
  reorder: vi.fn().mockResolvedValue(undefined),
  observe: vi.fn(() => () => {}),
});

const seed = (todos: Partial<Todo>[]): void => {
  const full: Todo[] = todos.map((o, i) => ({
    id: `id-${i}`,
    ownerId: 'local',
    title: 'x',
    done: false,
    reminders: [],
    category: 'prywatne',
    ...o,
  }));
  localStorage.setItem(LOCAL_TODOS_KEY, JSON.stringify(full));
};

describe('useLocalTodoTransfer', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('reports 0 when no local todos exist', () => {
    const { result } = renderHook(() => useLocalTodoTransfer(makeRepo()));
    expect(result.current.localCount).toBe(0);
    expect(result.current.busy).toBe(false);
    expect(result.current.message).toBeNull();
  });

  it('reports the current local count from localStorage', () => {
    seed([{ title: 'a' }, { title: 'b' }]);
    const { result } = renderHook(() => useLocalTodoTransfer(makeRepo()));
    expect(result.current.localCount).toBe(2);
  });

  it('updates the count when local todos change', () => {
    const { result } = renderHook(() => useLocalTodoTransfer(makeRepo()));
    expect(result.current.localCount).toBe(0);
    act(() => {
      seed([{ title: 'a' }]);
      window.dispatchEvent(new CustomEvent('todo-witek:todos-changed'));
    });
    expect(result.current.localCount).toBe(1);
  });

  it('onTransfer copies todos to the destination, clears local storage, and exposes a success message', async () => {
    seed([{ title: 'a' }, { title: 'b' }]);
    const repo = makeRepo();
    const { result } = renderHook(() => useLocalTodoTransfer(repo));
    await act(async () => {
      await result.current.onTransfer();
    });
    expect(repo.create).toHaveBeenCalledTimes(2);
    expect(localStorage.getItem(LOCAL_TODOS_KEY)).toBeNull();
    expect(result.current.localCount).toBe(0);
    expect(result.current.busy).toBe(false);
    expect(result.current.message).toContain('2');
  });

  it('exposes a failure message when the destination errors', async () => {
    seed([{ title: 'a' }]);
    const repo = makeRepo();
    (repo.create as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('boom')
    );
    const { result } = renderHook(() => useLocalTodoTransfer(repo));
    await act(async () => {
      await result.current.onTransfer();
    });
    expect(result.current.message).toBe('Nie udało się przenieść zadań.');
    expect(localStorage.getItem(LOCAL_TODOS_KEY)).not.toBeNull();
  });
});
