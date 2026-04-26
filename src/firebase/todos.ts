import {
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
  writeBatch,
  type DocumentData,
  type QuerySnapshot,
} from 'firebase/firestore';
import { getDb } from './app';
import type { Todo, NewTodo, TodoUpdate, Unsubscribe } from '../types';

const COL = 'todos';

const todosCol = () => collection(getDb(), COL);
const todoRef = (id: string) => doc(getDb(), COL, id);

// reminders is an array of Reminder. Stored on the todo doc to keep CRUD
// atomic and rules simple. New todos get a strictly-decreasing position
// so they appear at the top of the list by default; explicit reorder
// rewrites positions to 0..n-1.
export const createTodo = async (
  ownerId: string,
  { title, reminders = [] }: NewTodo
): Promise<string> => {
  const ref = await addDoc(todosCol(), {
    ownerId,
    title,
    done: false,
    reminders,
    position: -Date.now(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
};

export const updateTodo = (id: string, fields: TodoUpdate): Promise<void> =>
  updateDoc(todoRef(id), { ...fields, updatedAt: serverTimestamp() });

export const toggleDone = (id: string, done: boolean): Promise<void> =>
  updateDoc(todoRef(id), { done, updatedAt: serverTimestamp() });

export const deleteTodo = (id: string): Promise<void> =>
  deleteDoc(todoRef(id));

export const reorderTodos = async (orderedIds: string[]): Promise<void> => {
  const db = getDb();
  const batch = writeBatch(db);
  const ts = serverTimestamp();
  orderedIds.forEach((id, idx) => {
    batch.update(doc(db, COL, id), { position: idx, updatedAt: ts });
  });
  await batch.commit();
};

const sortByPosition = (todos: Todo[]): Todo[] =>
  todos.slice().sort((a, b) => {
    const pa = a.position ?? Number.POSITIVE_INFINITY;
    const pb = b.position ?? Number.POSITIVE_INFINITY;
    return pa - pb;
  });

export const observeUserTodos = (
  ownerId: string,
  callback: (todos: Todo[]) => void
): Unsubscribe => {
  // Sort client-side by position so we don't need a composite Firestore
  // index. Fetch ordered by createdAt desc as a stable backbone for ties
  // and so legacy todos without a position keep their previous order.
  const q = query(
    todosCol(),
    where('ownerId', '==', ownerId),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, (snap: QuerySnapshot<DocumentData>) => {
    const todos = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<Todo, 'id'>),
    }));
    callback(sortByPosition(todos));
  });
};
