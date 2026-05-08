import { describe, it, expect, vi, beforeEach } from 'vitest';

const collection = vi.fn();
const doc = vi.fn();
const addDoc = vi.fn();
const updateDoc = vi.fn();
const deleteDoc = vi.fn();
const onSnapshot = vi.fn();
const query = vi.fn();
const where = vi.fn();
const serverTimestamp = vi.fn();

collection.mockImplementation((_db: unknown, name: string) => ({ __col: name }));
doc.mockImplementation((_db: unknown, col: string, id: string) => ({
  __doc: `${col}/${id}`,
}));
query.mockImplementation((...args: unknown[]) => ({ __query: args }));
where.mockImplementation((field: string, op: string, val: unknown) => ({
  __where: [field, op, val],
}));
serverTimestamp.mockReturnValue('__SERVER_TS__');

vi.mock('firebase/firestore', () => ({
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
}));

vi.mock('./app', () => ({
  getDb: () => ({ __db: true }),
}));

const importCategories = async () => await import('./categories');

describe('categories repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    serverTimestamp.mockReturnValue('__SERVER_TS__');
    collection.mockImplementation((_db: unknown, name: string) => ({
      __col: name,
    }));
    doc.mockImplementation((_db: unknown, col: string, id: string) => ({
      __doc: `${col}/${id}`,
    }));
    query.mockImplementation((...args: unknown[]) => ({ __query: args }));
    where.mockImplementation((field: string, op: string, val: unknown) => ({
      __where: [field, op, val],
    }));
  });

  it('createCategory addDoc when no explicit id', async () => {
    addDoc.mockResolvedValue({ id: 'gen-id' });
    const { createCategory } = await importCategories();
    const before = Date.now();
    const id = await createCategory('user-1', { name: 'Hobby' });
    const after = Date.now();
    expect(addDoc).toHaveBeenCalledWith(
      { __col: 'categories' },
      expect.objectContaining({
        ownerId: 'user-1',
        name: 'Hobby',
        createdAt: '__SERVER_TS__',
        updatedAt: '__SERVER_TS__',
      })
    );
    // Position must be a positive timestamp so that, with the ascending
    // sort in observeUserCategories, freshly created categories end up
    // AFTER existing ones — that's where users expect what they just
    // added to appear in the tab bar.
    const payload = addDoc.mock.calls[0][1] as { position: number };
    expect(payload.position).toBeGreaterThanOrEqual(before);
    expect(payload.position).toBeLessThanOrEqual(after);
    expect(id).toBe('gen-id');
  });

  it('createCategory ignores the id hint and always addDoc on Firestore', async () => {
    addDoc.mockResolvedValue({ id: 'auto-id' });
    const { createCategory } = await importCategories();
    const id = await createCategory('user-1', {
      id: 'prywatne',
      name: 'Prywatne',
    });
    expect(addDoc).toHaveBeenCalledWith(
      { __col: 'categories' },
      expect.objectContaining({ ownerId: 'user-1', name: 'Prywatne' }),
    );
    expect(id).toBe('auto-id');
  });

  it('updateCategory merges fields and refreshes updatedAt', async () => {
    const { updateCategory } = await importCategories();
    await updateCategory('cat-1', { name: 'New' });
    expect(updateDoc).toHaveBeenCalledWith(
      { __doc: 'categories/cat-1' },
      { name: 'New', updatedAt: '__SERVER_TS__' }
    );
  });

  it('deleteCategory deletes by id', async () => {
    const { deleteCategory } = await importCategories();
    await deleteCategory('cat-1');
    expect(deleteDoc).toHaveBeenCalledWith({ __doc: 'categories/cat-1' });
  });

  it('observeUserCategories filters by ownerId and parses snapshot docs', async () => {
    const unsub = vi.fn();
    onSnapshot.mockImplementation(
      (
        _q: unknown,
        next: (snap: { docs: { id: string; data: () => unknown }[] }) => void
      ) => {
        next({
          docs: [{ id: 'c1', data: () => ({ name: 'A', ownerId: 'user-1' }) }],
        });
        return unsub;
      }
    );
    const cb = vi.fn();
    const { observeUserCategories } = await importCategories();
    const off = observeUserCategories('user-1', cb);
    expect(where).toHaveBeenCalledWith('ownerId', '==', 'user-1');
    expect(cb).toHaveBeenCalledWith([
      { id: 'c1', name: 'A', ownerId: 'user-1' },
    ]);
    expect(off).toBe(unsub);
  });

  it('observeUserCategories forwards errors to onError', async () => {
    const unsub = vi.fn();
    const err = Object.assign(new Error('denied'), {
      code: 'permission-denied',
    });
    onSnapshot.mockImplementation(
      (_q: unknown, _next: unknown, error: (e: Error) => void) => {
        error(err);
        return unsub;
      }
    );
    const onError = vi.fn();
    const { observeUserCategories } = await importCategories();
    observeUserCategories('user-1', vi.fn(), onError);
    expect(onError).toHaveBeenCalledWith(err);
  });
});
