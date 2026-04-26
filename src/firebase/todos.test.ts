import { describe, it, expect, vi, beforeEach } from 'vitest';

const collection = vi.fn();
const doc = vi.fn();
const addDoc = vi.fn();
const updateDoc = vi.fn();
const deleteDoc = vi.fn();
const onSnapshot = vi.fn();
const query = vi.fn();
const where = vi.fn();
const orderBy = vi.fn();
const serverTimestamp = vi.fn();

collection.mockImplementation((_db: unknown, name: string) => ({ __col: name }));
doc.mockImplementation((_db: unknown, col: string, id: string) => ({
  __doc: `${col}/${id}`,
}));
query.mockImplementation((...args: unknown[]) => ({ __query: args }));
where.mockImplementation((field: string, op: string, val: unknown) => ({
  __where: [field, op, val],
}));
orderBy.mockImplementation((field: string, dir: string) => ({
  __orderBy: [field, dir],
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
  orderBy,
  serverTimestamp,
}));

vi.mock('./app', () => ({
  getDb: () => ({ __db: true }),
}));

const importTodos = async () => await import('./todos');

describe('todos repository', () => {
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
    orderBy.mockImplementation((field: string, dir: string) => ({
      __orderBy: [field, dir],
    }));
  });

  it('createTodo writes a doc owned by the user with done=false', async () => {
    addDoc.mockResolvedValue({ id: 'new-id' });
    const { createTodo } = await importTodos();
    const id = await createTodo('user-1', { title: 'Buy milk', reminders: [] });
    expect(collection).toHaveBeenCalledWith({ __db: true }, 'todos');
    expect(addDoc).toHaveBeenCalledWith(
      { __col: 'todos' },
      expect.objectContaining({
        ownerId: 'user-1',
        title: 'Buy milk',
        done: false,
        reminders: [],
        createdAt: '__SERVER_TS__',
        updatedAt: '__SERVER_TS__',
      })
    );
    expect(id).toBe('new-id');
  });

  it('updateTodo merges fields and refreshes updatedAt', async () => {
    const { updateTodo: update } = await importTodos();
    await update('todo-1', { title: 'New' });
    expect(doc).toHaveBeenCalledWith({ __db: true }, 'todos', 'todo-1');
    expect(updateDoc).toHaveBeenCalledWith(
      { __doc: 'todos/todo-1' },
      { title: 'New', updatedAt: '__SERVER_TS__' }
    );
  });

  it('toggleDone flips the done flag', async () => {
    const { toggleDone } = await importTodos();
    await toggleDone('todo-1', true);
    expect(updateDoc).toHaveBeenCalledWith(
      { __doc: 'todos/todo-1' },
      { done: true, updatedAt: '__SERVER_TS__' }
    );
  });

  it('deleteTodo deletes by id', async () => {
    const { deleteTodo: del } = await importTodos();
    await del('todo-1');
    expect(deleteDoc).toHaveBeenCalledWith({ __doc: 'todos/todo-1' });
  });

  it('observeUserTodos subscribes with where(ownerId) and orderBy(createdAt)', async () => {
    const unsub = vi.fn();
    onSnapshot.mockImplementation(
      (
        _q: unknown,
        next: (snap: { docs: { id: string; data: () => unknown }[] }) => void
      ) => {
        next({ docs: [{ id: 't1', data: () => ({ title: 'A' }) }] });
        return unsub;
      }
    );
    const cb = vi.fn();
    const { observeUserTodos } = await importTodos();
    const off = observeUserTodos('user-1', cb);
    expect(where).toHaveBeenCalledWith('ownerId', '==', 'user-1');
    expect(orderBy).toHaveBeenCalledWith('createdAt', 'desc');
    expect(cb).toHaveBeenCalledWith([{ id: 't1', title: 'A' }]);
    expect(off).toBe(unsub);
  });
});
