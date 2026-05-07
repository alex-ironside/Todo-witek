import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createLocalCategoryRepo,
  LOCAL_CATEGORIES_KEY,
} from './localCategoryRepo';

describe('localCategoryRepo', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts with an empty list', () => {
    const repo = createLocalCategoryRepo();
    const cb = vi.fn();
    const off = repo.observe(cb);
    expect(cb).toHaveBeenCalledWith([]);
    off();
  });

  it('create persists a category with a generated id', async () => {
    const repo = createLocalCategoryRepo();
    const id = await repo.create({ name: 'Hobby' });
    const raw = JSON.parse(
      localStorage.getItem(LOCAL_CATEGORIES_KEY) || '[]'
    );
    expect(raw).toHaveLength(1);
    expect(raw[0].id).toBe(id);
    expect(raw[0].name).toBe('Hobby');
    expect(raw[0].ownerId).toBe('local');
  });

  it('create with explicit id uses that id (for seeding)', async () => {
    const repo = createLocalCategoryRepo();
    const id = await repo.create({ id: 'prywatne', name: 'Prywatne' });
    expect(id).toBe('prywatne');
    const raw = JSON.parse(
      localStorage.getItem(LOCAL_CATEGORIES_KEY) || '[]'
    );
    expect(raw[0].id).toBe('prywatne');
  });

  it('create with an already-existing id is a no-op (idempotent seed)', async () => {
    const repo = createLocalCategoryRepo();
    await repo.create({ id: 'prywatne', name: 'Prywatne' });
    await repo.create({ id: 'prywatne', name: 'Other' });
    const raw = JSON.parse(
      localStorage.getItem(LOCAL_CATEGORIES_KEY) || '[]'
    );
    expect(raw).toHaveLength(1);
    expect(raw[0].name).toBe('Prywatne');
  });

  it('update renames a category', async () => {
    const repo = createLocalCategoryRepo();
    const id = await repo.create({ name: 'Old' });
    await repo.update(id, { name: 'New' });
    const raw = JSON.parse(
      localStorage.getItem(LOCAL_CATEGORIES_KEY) || '[]'
    );
    expect(raw[0].name).toBe('New');
  });

  it('delete removes a category', async () => {
    const repo = createLocalCategoryRepo();
    const id = await repo.create({ name: 'Tmp' });
    await repo.delete(id);
    const raw = JSON.parse(
      localStorage.getItem(LOCAL_CATEGORIES_KEY) || '[]'
    );
    expect(raw).toEqual([]);
  });

  it('observe receives the new list after create', async () => {
    const repo = createLocalCategoryRepo();
    const cb = vi.fn();
    const off = repo.observe(cb);
    await repo.create({ name: 'A' });
    expect(cb).toHaveBeenLastCalledWith(
      expect.arrayContaining([expect.objectContaining({ name: 'A' })])
    );
    off();
  });

  it('observe stops receiving updates after unsubscribe', async () => {
    const repo = createLocalCategoryRepo();
    const cb = vi.fn();
    const off = repo.observe(cb);
    cb.mockClear();
    off();
    await repo.create({ name: 'A' });
    expect(cb).not.toHaveBeenCalled();
  });

  it('observe orders by position then by createdAt asc', async () => {
    const repo = createLocalCategoryRepo();
    await repo.create({ name: 'A' });
    await repo.create({ name: 'B' });
    const cb = vi.fn();
    const off = repo.observe(cb);
    const list = cb.mock.calls[0][0];
    // Categories appear in insertion order: a freshly added category
    // shows up at the end of the tab bar (where users look for what
    // they just typed), not at the start.
    expect(list.map((c: { name: string }) => c.name)).toEqual(['A', 'B']);
    off();
  });

  it('a third category appended after two existing ones lands at the end', async () => {
    const repo = createLocalCategoryRepo();
    await repo.create({ id: 'prywatne', name: 'Prywatne' });
    await repo.create({ id: 'sluzbowe', name: 'Służbowe' });
    await repo.create({ name: 'Hobby' });
    const cb = vi.fn();
    const off = repo.observe(cb);
    const list = cb.mock.calls[0][0];
    expect(list.map((c: { name: string }) => c.name)).toEqual([
      'Prywatne',
      'Służbowe',
      'Hobby',
    ]);
    off();
  });
});
