import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { firebaseConfig, isConfigured } from './config.js';

// Single source of truth for the Firebase app instance.
// Idempotent so HMR / multiple imports don't re-initialize.
const createApp = () => {
  if (!isConfigured()) {
    throw new Error(
      'Firebase config is missing. Fill src/firebase/config.js before running the app.'
    );
  }
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
};

let _app;
let _db;
let _auth;

export const getFirebaseApp = () => {
  if (!_app) _app = createApp();
  return _app;
};

export const getDb = () => {
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

export const getFirebaseAuth = () => {
  if (!_auth) _auth = getAuth(getFirebaseApp());
  return _auth;
};
