/**
 * Direct Firestore SDK test — logs in and runs the same query as the app.
 * Surfaces the exact error from Firestore (not browser-filtered).
 */
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, query, where, orderBy, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDwy45pYYRH26lGTasIKyJkVUx7YHTUb0Q",
  authDomain: "todo-witek-6a21e.firebaseapp.com",
  projectId: "todo-witek-6a21e",
  storageBucket: "todo-witek-6a21e.firebasestorage.app",
  messagingSenderId: "1076835553082",
  appId: "1:1076835553082:web:d45fc915d2f55358bb4a03",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function main() {
  console.log('Signing in...');
  const cred = await signInWithEmailAndPassword(auth, 'alex@gmail.com', 'zaq1@WSX');
  const uid = cred.user.uid;
  console.log('Signed in as uid:', uid);

  console.log('Running query: where(ownerId ==', uid, ') orderBy(createdAt desc)');
  const q = query(
    collection(db, 'todos'),
    where('ownerId', '==', uid),
    orderBy('createdAt', 'desc')
  );

  try {
    const snap = await getDocs(q);
    console.log('Query succeeded. Docs count:', snap.size);
    snap.forEach(d => console.log(' -', d.id, d.data()));
  } catch (err) {
    console.error('Query failed:', err.code, err.message);
  }

  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
