import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User,
  type UserCredential,
} from 'firebase/auth';
import { getFirebaseAuth } from './app';
import type { Unsubscribe } from '../types';

// Thin wrappers around the Firebase Auth SDK so the rest of the app
// depends on a stable interface (Dependency Inversion).

export const login = (email: string, password: string): Promise<UserCredential> =>
  signInWithEmailAndPassword(getFirebaseAuth(), email, password);

export const logout = (): Promise<void> => signOut(getFirebaseAuth());

export const observeAuth = (
  callback: (user: User | null) => void
): Unsubscribe => onAuthStateChanged(getFirebaseAuth(), callback);
