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
} from 'firebase/firestore';
import { getDb } from './app.js';

const COL = 'todos';

const todosCol = () => collection(getDb(), COL);
const todoRef = (id) => doc(getDb(), COL, id);

// reminders is an array of { id, remindAt (ms), fired (bool) }.
// Stored on the todo doc to keep CRUD atomic and rules simple.
export const createTodo = (ownerId, { title, reminders = [] }) =>
  addDoc(todosCol(), {
    ownerId,
    title,
    done: false,
    reminders,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }).then((ref) => ref.id);

export const updateTodo = (id, fields) =>
  updateDoc(todoRef(id), { ...fields, updatedAt: serverTimestamp() });

export const toggleDone = (id, done) =>
  updateDoc(todoRef(id), { done, updatedAt: serverTimestamp() });

export const deleteTodo = (id) => deleteDoc(todoRef(id));

export const observeUserTodos = (ownerId, callback) => {
  const q = query(
    todosCol(),
    where('ownerId', '==', ownerId),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
};
