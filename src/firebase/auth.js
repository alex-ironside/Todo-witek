import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { getFirebaseAuth } from './app.js';

// Thin wrappers around the Firebase Auth SDK so the rest of the app
// depends on a stable interface (Dependency Inversion).

export const login = (email, password) =>
  signInWithEmailAndPassword(getFirebaseAuth(), email, password);

export const logout = () => signOut(getFirebaseAuth());

export const observeAuth = (callback) =>
  onAuthStateChanged(getFirebaseAuth(), callback);
