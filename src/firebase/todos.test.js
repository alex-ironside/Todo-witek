import { describe, it, expect, vi, beforeEach } from 'vitest';

const collection = vi.fn((_db, name) => ({ __col: name }));
const doc = vi.fn((_db, col, id) => ({ __doc: `${col}/${id}` }));
const addDoc = vi.fn();
const updateDoc = vi.fn();
const deleteDoc = vi.fn();
const onSnapshot = vi.fn();
const query = vi.fn((...args) => ({ __query: args }));
const where = vi.fn((field, op, val) => ({ __where: [field, op, val] }));
const orderBy = vi.fn((field, dir) => ({ __orderBy: [field, dir] }));
const serverTimestamp = vi.fn(() => '__SERVER_TS__');

vi.mock('firebase/firestore', () => ({
  collection: (...a) => collection(...a),
  doc: (...a) => doc(...a),
  addDoc: (...a) => addDoc(...a),
  updateDoc: (...a) => updateDoc(...a),
  deleteDoc: (...a) => deleteDoc(...a),
  onSnapshot: (...a) => onSnapshot(...a),
  query: (...a) => query(...a),
  where: (...a) => where(...a),
  orderBy: (...a) => orderBy(...a),
  serverTimestamp: (...a) => serverTimestamp(...a),
}));

vi.mock('./app.js', () => ({
  getDb: () => ({ __db: true }),
}));

const importTodos = async () => await import('./todos.js');

describe('todos repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    const { updateTodo } = await importTodos();
    await updateTodo('todo-1', { title: 'New' });
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
    const { deleteTodo } = await importTodos();
    await deleteTodo('todo-1');
    expect(deleteDoc).toHaveBeenCalledWith({ __doc: 'todos/todo-1' });
  });

  it('observeUserTodos subscribes with where(ownerId) and orderBy(createdAt)', async () => {
    const unsub = vi.fn();
    onSnapshot.mockImplementation((_q, next) => {
      next({ docs: [{ id: 't1', data: () => ({ title: 'A' }) }] });
      return unsub;
    });
    const cb = vi.fn();
    const { observeUserTodos } = await importTodos();
    const off = observeUserTodos('user-1', cb);
    expect(where).toHaveBeenCalledWith('ownerId', '==', 'user-1');
    expect(orderBy).toHaveBeenCalledWith('createdAt', 'desc');
    expect(cb).toHaveBeenCalledWith([{ id: 't1', title: 'A' }]);
    expect(off).toBe(unsub);
  });
});
