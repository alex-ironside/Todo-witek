import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore';
import { getAuth, type Auth } from 'firebase/auth';
import { firebaseConfig, isConfigured } from './config';

// Single source of truth for the Firebase app instance.
// Idempotent so HMR / multiple imports don't re-initialize.

let _app: FirebaseApp | undefined;
let _db: Firestore | undefined;
let _auth: Auth | undefined;

const createApp = (): FirebaseApp => {
  if (!isConfigured()) {
    throw new Error(
      'Firebase config is missing. Fill src/firebase/config.ts before running the app.'
    );
  }
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
};

export const getFirebaseApp = (): FirebaseApp => {
  if (!_app) _app = createApp();
  return _app;
};

export const getDb = (): Firestore => {
  if (!_db) {
    // Offline-first: IndexedDB cache + multi-tab support.
    // Writes made offline are queued and replayed on reconnect.
    _db = initializeFirestore(getFirebaseApp(), {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    });
  }
  return _db;
};

export const getFirebaseAuth = (): Auth => {
  if (!_auth) _auth = getAuth(getFirebaseApp());
  return _auth;
};
