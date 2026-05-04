/**
 * Uses the Firebase JS SDK directly in Node to test onSnapshot.
 * This bypasses the browser/Playwright layer and gives raw SDK errors.
 */
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import {
  getFirestore,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  enableNetwork,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyDwy45pYYRH26lGTasIKyJkVUx7YHTUb0Q',
  authDomain: 'todo-witek-6a21e.firebaseapp.com',
  projectId: 'todo-witek-6a21e',
  storageBucket: 'todo-witek-6a21e.firebasestorage.app',
  messagingSenderId: '1076835553082',
  appId: '1:1076835553082:web:d45fc915d2f55358bb4a03',
};

async function main() {
  const app = initializeApp(firebaseConfig, 'test-instance');
  const auth = getAuth(app);
  const db = getFirestore(app);

  console.log('Signing in...');
  const cred = await signInWithEmailAndPassword(auth, 'alex@gmail.com', 'zaq1@WSX');
  const uid = cred.user.uid;
  console.log('Signed in, uid:', uid);

  console.log('Setting up onSnapshot with where + orderBy...');
  const q = query(
    collection(db, 'todos'),
    where('ownerId', '==', uid),
    orderBy('createdAt', 'desc')
  );

  let resolved = false;
  const unsub = onSnapshot(
    q,
    (snap) => {
      resolved = true;
      console.log('SUCCESS: snapshot received, docs:', snap.docs.length);
      unsub();
    },
    (err) => {
      resolved = true;
      console.error('ERROR from onSnapshot:', err.code, err.message);
      unsub();
    }
  );

  // Wait up to 15s for a response
  for (let i = 0; i < 15; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    console.log(`t+${i + 1}s: resolved=${resolved}`);
    if (resolved) break;
  }

  if (!resolved) {
    console.log('TIMEOUT: onSnapshot never fired (no snapshot, no error)');
  }

  process.exit(0);
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
