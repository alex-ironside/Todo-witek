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
  type DocumentData,
  type QuerySnapshot,
} from 'firebase/firestore';
import { getDb } from './app';
import type { Todo, NewTodo, Reminder, Unsubscribe } from '../types';

const COL = 'todos';

const todosCol = () => collection(getDb(), COL);
const todoRef = (id: string) => doc(getDb(), COL, id);

// reminders is an array of Reminder. Stored on the todo doc to keep CRUD
// atomic and rules simple.
export const createTodo = async (
  ownerId: string,
  { title, reminders = [] }: NewTodo
): Promise<string> => {
  const ref = await addDoc(todosCol(), {
    ownerId,
    title,
    done: false,
    reminders,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
};

export type TodoUpdate = Partial<{
  title: string;
  done: boolean;
  reminders: Reminder[];
}>;

export const updateTodo = (id: string, fields: TodoUpdate): Promise<void> =>
  updateDoc(todoRef(id), { ...fields, updatedAt: serverTimestamp() });

export const toggleDone = (id: string, done: boolean): Promise<void> =>
  updateDoc(todoRef(id), { done, updatedAt: serverTimestamp() });

export const deleteTodo = (id: string): Promise<void> =>
  deleteDoc(todoRef(id));

export const observeUserTodos = (
  ownerId: string,
  callback: (todos: Todo[]) => void
): Unsubscribe => {
  const q = query(
    todosCol(),
    where('ownerId', '==', ownerId),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, (snap: QuerySnapshot<DocumentData>) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Todo, 'id'>) })));
  });
};
