import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createLocalTodoRepo, LOCAL_TODOS_KEY } from './localTodoRepo';

describe('localTodoRepo', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts with an empty list', async () => {
    const repo = createLocalTodoRepo();
    const cb = vi.fn();
    const off = repo.observe(cb);
    expect(cb).toHaveBeenCalledWith([]);
    off();
  });

  it('create persists a todo with a generated id and done=false', async () => {
    const repo = createLocalTodoRepo();
    const id = await repo.create({ title: 'Buy milk' });
    const raw = JSON.parse(localStorage.getItem(LOCAL_TODOS_KEY) || '[]');
    expect(raw).toHaveLength(1);
    expect(raw[0].id).toBe(id);
    expect(raw[0].title).toBe('Buy milk');
    expect(raw[0].done).toBe(false);
    expect(raw[0].reminders).toEqual([]);
  });

  it('observe receives the new list after create', async () => {
    const repo = createLocalTodoRepo();
    const cb = vi.fn();
    const off = repo.observe(cb);
    await repo.create({ title: 'A' });
    expect(cb).toHaveBeenLastCalledWith(
      expect.arrayContaining([expect.objectContaining({ title: 'A' })])
    );
    off();
  });

  it('toggleDone flips the done flag', async () => {
    const repo = createLocalTodoRepo();
    const id = await repo.create({ title: 'A' });
    await repo.toggleDone(id, true);
    const raw = JSON.parse(localStorage.getItem(LOCAL_TODOS_KEY) || '[]');
    expect(raw[0].done).toBe(true);
  });

  it('update merges fields without touching unrelated todos', async () => {
    const repo = createLocalTodoRepo();
    const a = await repo.create({ title: 'A' });
    const b = await repo.create({ title: 'B' });
    await repo.update(a, { title: 'A2' });
    const raw = JSON.parse(localStorage.getItem(LOCAL_TODOS_KEY) || '[]');
    const byId = Object.fromEntries(raw.map((t: { id: string; title: string }) => [t.id, t.title]));
    expect(byId[a]).toBe('A2');
    expect(byId[b]).toBe('B');
  });

  it('delete removes the todo', async () => {
    const repo = createLocalTodoRepo();
    const id = await repo.create({ title: 'A' });
    await repo.delete(id);
    const raw = JSON.parse(localStorage.getItem(LOCAL_TODOS_KEY) || '[]');
    expect(raw).toEqual([]);
  });

  it('observe stops receiving updates after unsubscribe', async () => {
    const repo = createLocalTodoRepo();
    const cb = vi.fn();
    const off = repo.observe(cb);
    cb.mockClear();
    off();
    await repo.create({ title: 'A' });
    expect(cb).not.toHaveBeenCalled();
  });

  it('observe sees changes made by another repo instance (cross-tab via storage event)', async () => {
    const repoA = createLocalTodoRepo();
    const repoB = createLocalTodoRepo();
    const cb = vi.fn();
    const off = repoA.observe(cb);
    cb.mockClear();
    await repoB.create({ title: 'X' });
    expect(cb).toHaveBeenCalled();
    off();
  });

  it('orders newest first', async () => {
    const repo = createLocalTodoRepo();
    await repo.create({ title: 'first' });
    await repo.create({ title: 'second' });
    const cb = vi.fn();
    const off = repo.observe(cb);
    const list = cb.mock.calls[0][0];
    expect(list[0].title).toBe('second');
    expect(list[1].title).toBe('first');
    off();
  });

  it('reorder sets positions according to the provided order', async () => {
    const repo = createLocalTodoRepo();
    const a = await repo.create({ title: 'A' });
    const b = await repo.create({ title: 'B' });
    const c = await repo.create({ title: 'C' });
    await repo.reorder([a, b, c]);
    const cb = vi.fn();
    const off = repo.observe(cb);
    const list = cb.mock.calls[0][0];
    expect(list.map((t: { title: string }) => t.title)).toEqual(['A', 'B', 'C']);
    off();
  });

  it('reorder ignores ids that are not in the list', async () => {
    const repo = createLocalTodoRepo();
    const a = await repo.create({ title: 'A' });
    await expect(repo.reorder([a, 'ghost'])).resolves.toBeUndefined();
  });
});
