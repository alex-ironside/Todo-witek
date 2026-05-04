/**
 * After login, evaluates a Firestore query directly in the page
 * to check whether the snapshot fires and what it returns.
 */
import { chromium } from '@playwright/test';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  const logs: string[] = [];
  page.on('console', (msg) => {
    logs.push(`[${msg.type()}] ${msg.text()}`);
  });

  await page.goto('http://localhost:5173/todo-witek/', { waitUntil: 'networkidle' });
  await page.locator('[role="group"] button').filter({ hasText: /chmura/i }).click();
  await page.waitForTimeout(500);
  await page.locator('input[type="email"]').fill('alex@gmail.com');
  await page.locator('input[type="password"]').fill('zaq1@WSX');
  await page.locator('button[type="submit"]').click();
  await page.waitForFunction(() => !document.querySelector('input[type="password"]'), { timeout: 15000 });
  console.log('Auth complete');

  // Wait for Firestore to initialize
  await page.waitForTimeout(3000);

  // Inject a direct Firestore query to test snapshot behavior
  const result = await page.evaluate(() => {
    return new Promise<{ status: string; docCount?: number; error?: string; timedOut?: boolean }>((resolve) => {
      // Access the Firestore instance via the module system if possible
      // Since Vite HMR exposes modules, try to access window.__firestore or similar
      // Otherwise test via a simplified fetch to the Listen channel

      // Check if window has any Firebase references
      const keys = Object.keys(window).filter(k =>
        k.toLowerCase().includes('firebase') ||
        k.toLowerCase().includes('firestore') ||
        k.toLowerCase().includes('__vite')
      );

      // Try to get the current user from Firebase auth in IndexedDB
      const req = indexedDB.open('firebaseLocalStorageDb');
      req.onsuccess = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('firebaseLocalStorage')) {
          resolve({ status: 'no-auth-store' });
          return;
        }
        const tx = db.transaction('firebaseLocalStorage', 'readonly');
        const store = tx.objectStore('firebaseLocalStorage');
        const all = store.getAll();
        all.onsuccess = () => {
          const entries = all.result as Array<{ fbase_key: string; value: Record<string, unknown> }>;
          const userEntry = entries.find(e => String(e.fbase_key).includes('currentUser'));
          if (userEntry) {
            resolve({
              status: 'auth-found',
              docCount: undefined,
              error: `uid=${userEntry.value?.uid}, email=${userEntry.value?.email}`,
            });
          } else {
            const allKeys = entries.map(e => e.fbase_key);
            resolve({ status: 'no-user', error: 'keys: ' + allKeys.join(', ') });
          }
        };
        all.onerror = () => resolve({ status: 'indexeddb-error' });
      };
      req.onerror = () => resolve({ status: 'indexeddb-open-error' });
    });
  });

  console.log('In-page result:', JSON.stringify(result));

  // Check Firestore IndexedDB state
  const firestoreDbState = await page.evaluate(() => {
    return new Promise<string>((resolve) => {
      const req = indexedDB.open('firestore/[DEFAULT]/todo-witek-6a21e/main');
      req.onsuccess = () => {
        const db = req.result;
        const stores = Array.from(db.objectStoreNames);
        resolve('Stores: ' + stores.join(', '));

        // Try to read from the target_globals store
        if (db.objectStoreNames.contains('target_globals')) {
          const tx = db.transaction('target_globals', 'readonly');
          const store = tx.objectStore('target_globals');
          const all = store.getAll();
          all.onsuccess = () => {
            console.log('target_globals:', JSON.stringify(all.result).slice(0, 200));
          };
        }
        if (db.objectStoreNames.contains('mutations')) {
          const tx = db.transaction('mutations', 'readonly');
          const store = tx.objectStore('mutations');
          const all = store.getAll();
          all.onsuccess = () => {
            console.log('mutations count:', all.result.length);
          };
        }
      };
      req.onerror = () => resolve('error opening firestore db');
      req.onblocked = () => resolve('blocked');
    });
  });

  console.log('Firestore IDB state:', firestoreDbState);

  // Wait for more logs
  await page.waitForTimeout(2000);

  console.log('\nAll console logs:');
  logs.forEach(l => console.log(l));

  await browser.close();
}

main().catch(console.error);
