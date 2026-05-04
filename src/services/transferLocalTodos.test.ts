import { describe, it, expect, beforeEach, vi } from 'vitest';
import { transferLocalTodosTo } from './transferLocalTodos';
import { LOCAL_TODOS_KEY } from '../repos/localTodoRepo';
import type { Todo, TodoRepository } from '../types';

const makeRepo = (): TodoRepository => ({
  create: vi.fn().mockImplementation((_input) => Promise.resolve('new-id')),
  update: vi.fn().mockResolvedValue(undefined),
  toggleDone: vi.fn().mockResolvedValue(undefined),
  delete: vi.fn().mockResolvedValue(undefined),
  reorder: vi.fn().mockResolvedValue(undefined),
  observe: vi.fn(() => () => {}),
});

const seedLocalTodos = (todos: Todo[]) => {
  localStorage.setItem(LOCAL_TODOS_KEY, JSON.stringify(todos));
};

const localTodo = (over: Partial<Todo> = {}): Todo => ({
  id: 'lid',
  ownerId: 'local',
  title: 'local item',
  done: false,
  reminders: [],
  category: 'prywatne',
  position: -1,
  createdAt: 1,
  updatedAt: 1,
  ...over,
});

describe('transferLocalTodosTo', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns 0 transferred when no local todos exist', async () => {
    const repo = makeRepo();
    const result = await transferLocalTodosTo(repo);
    expect(result.transferred).toBe(0);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('creates one destination todo per local todo, preserving title/reminders/category', async () => {
    seedLocalTodos([
      localTodo({ id: 'a', title: 'A', category: 'prywatne' }),
      localTodo({
        id: 'b',
        title: 'B',
        category: 'sluzbowe',
        reminders: [{ id: 'r1', remindAt: 5, fired: false }],
      }),
    ]);
    const repo = makeRepo();
    const result = await transferLocalTodosTo(repo);
    expect(result.transferred).toBe(2);
    expect(repo.create).toHaveBeenCalledTimes(2);
    expect(repo.create).toHaveBeenNthCalledWith(1, {
      title: 'A',
      reminders: [],
      category: 'prywatne',
    });
    expect(repo.create).toHaveBeenNthCalledWith(2, {
      title: 'B',
      reminders: [{ id: 'r1', remindAt: 5, fired: false }],
      category: 'sluzbowe',
    });
  });

  it('marks todo as done on destination if it was done locally', async () => {
    seedLocalTodos([localTodo({ id: 'a', title: 'A', done: true })]);
    const repo = makeRepo();
    (repo.create as ReturnType<typeof vi.fn>).mockResolvedValueOnce('new-1');
    await transferLocalTodosTo(repo);
    expect(repo.toggleDone).toHaveBeenCalledWith('new-1', true);
  });

  it('does not call toggleDone for open local todos', async () => {
    seedLocalTodos([localTodo({ id: 'a', done: false })]);
    const repo = makeRepo();
    await transferLocalTodosTo(repo);
    expect(repo.toggleDone).not.toHaveBeenCalled();
  });

  it('clears local storage after a successful transfer when clearLocalAfter=true', async () => {
    seedLocalTodos([localTodo({ id: 'a' })]);
    const repo = makeRepo();
    await transferLocalTodosTo(repo, { clearLocalAfter: true });
    expect(localStorage.getItem(LOCAL_TODOS_KEY)).toBeNull();
  });

  it('does not clear local storage when clearLocalAfter is omitted', async () => {
    seedLocalTodos([localTodo({ id: 'a' })]);
    const repo = makeRepo();
    await transferLocalTodosTo(repo);
    expect(localStorage.getItem(LOCAL_TODOS_KEY)).not.toBeNull();
  });

  it('propagates the error and does not clear storage when create fails', async () => {
    seedLocalTodos([localTodo({ id: 'a' })]);
    const repo = makeRepo();
    (repo.create as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('boom')
    );
    await expect(
      transferLocalTodosTo(repo, { clearLocalAfter: true })
    ).rejects.toThrow('boom');
    expect(localStorage.getItem(LOCAL_TODOS_KEY)).not.toBeNull();
  });
});
