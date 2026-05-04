import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getDb } from './app';
import { ACCENTS, type AccentKey } from '../theme/accents';

const isAccentKey = (v: unknown): v is AccentKey =>
  typeof v === 'string' && v in ACCENTS;

const accentDoc = (userId: string) =>
  doc(getDb(), 'users', userId, 'preferences', 'accent');

export const getCloudAccent = async (
  userId: string
): Promise<AccentKey | null> => {
  const snap = await getDoc(accentDoc(userId));
  if (!snap.exists()) return null;
  const data = snap.data() as { value?: unknown };
  return isAccentKey(data.value) ? data.value : null;
};

export const setCloudAccent = async (
  userId: string,
  key: AccentKey
): Promise<void> => {
  await setDoc(accentDoc(userId), { value: key });
};
