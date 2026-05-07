import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
  type DocumentData,
  type QuerySnapshot,
} from 'firebase/firestore';
import { getDb } from './app';
import type {
  Category,
  CategoryUpdate,
  NewCategory,
  Unsubscribe,
} from '../types';

const COL = 'categories';

const categoriesCol = () => collection(getDb(), COL);
const categoryRef = (id: string) => doc(getDb(), COL, id);

// We always let Firestore generate the doc id with addDoc. The `id`
// hint in NewCategory is honored only by the local repo (where storage
// is per-device, so deterministic seed ids are safe). On Firestore the
// `categories` collection is shared across users, so a deterministic
// seed id like 'prywatne' would collide between users — only the first
// to claim it could ever own that doc, and subsequent users would silently
// fail under the rules. Auto-ids per user sidestep that entirely.
export const createCategory = async (
  ownerId: string,
  { name }: NewCategory
): Promise<string> => {
  const payload = {
    ownerId,
    name,
    position: -Date.now(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const ref = await addDoc(categoriesCol(), payload);
  return ref.id;
};

export const updateCategory = (
  id: string,
  fields: CategoryUpdate
): Promise<void> =>
  updateDoc(categoryRef(id), { ...fields, updatedAt: serverTimestamp() });

export const deleteCategory = (id: string): Promise<void> =>
  deleteDoc(categoryRef(id));

const sortByPosition = (cats: Category[]): Category[] =>
  cats.slice().sort((a, b) => {
    const pa = a.position ?? Number.POSITIVE_INFINITY;
    const pb = b.position ?? Number.POSITIVE_INFINITY;
    return pa - pb;
  });

export const observeUserCategories = (
  ownerId: string,
  callback: (cats: Category[]) => void,
  onError?: (err: Error) => void
): Unsubscribe => {
  // Sort client-side by position so we don't need a composite index.
  const q = query(categoriesCol(), where('ownerId', '==', ownerId));
  return onSnapshot(
    q,
    (snap: QuerySnapshot<DocumentData>) => {
      const cats = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Category, 'id'>),
      }));
      callback(sortByPosition(cats));
    },
    (err) => {
      console.error('[categories] onSnapshot error:', err.code, err.message);
      onError?.(err);
    }
  );
};
