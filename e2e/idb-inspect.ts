/**
 * Inspects Firestore IndexedDB state after login.
 */
import { chromium } from '@playwright/test';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  await page.goto('http://localhost:5173/todo-witek/', { waitUntil: 'networkidle' });
  await page.locator('[role="group"] button').filter({ hasText: /chmura/i }).click();
  await page.waitForTimeout(500);
  await page.locator('input[type="email"]').fill('alex@gmail.com');
  await page.locator('input[type="password"]').fill('zaq1@WSX');
  await page.locator('button[type="submit"]').click();
  await page.waitForFunction(() => !document.querySelector('input[type="password"]'), { timeout: 15000 });
  await page.waitForTimeout(5000);

  const ownerData = await page.evaluate(() => {
    return new Promise<unknown>((resolve) => {
      const req = indexedDB.open('firestore/[DEFAULT]/todo-witek-6a21e/main');
      req.onerror = () => resolve({ error: 'open failed' });
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction('owner', 'readonly');
        const store = tx.objectStore('owner');
        const all = store.getAll();
        all.onsuccess = () => resolve(all.result);
        all.onerror = () => resolve({ error: 'read failed' });
      };
    });
  });
  console.log('owner:', JSON.stringify(ownerData));

  const targetsData = await page.evaluate(() => {
    return new Promise<unknown>((resolve) => {
      const req = indexedDB.open('firestore/[DEFAULT]/todo-witek-6a21e/main');
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction('targets', 'readonly');
        const store = tx.objectStore('targets');
        const all = store.getAll();
        all.onsuccess = () => resolve(all.result);
        all.onerror = () => resolve({ error: 'read failed' });
      };
      req.onerror = () => resolve({ error: 'open failed' });
    });
  });
  console.log('targets:', JSON.stringify(targetsData));

  const globalData = await page.evaluate(() => {
    return new Promise<unknown>((resolve) => {
      const req = indexedDB.open('firestore/[DEFAULT]/todo-witek-6a21e/main');
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction('targetGlobal', 'readonly');
        const store = tx.objectStore('targetGlobal');
        const all = store.getAll();
        all.onsuccess = () => resolve(all.result);
        all.onerror = () => resolve({ error: 'read failed' });
      };
      req.onerror = () => resolve({ error: 'open failed' });
    });
  });
  console.log('targetGlobal:', JSON.stringify(globalData));

  const clientMeta = await page.evaluate(() => {
    return new Promise<unknown>((resolve) => {
      const req = indexedDB.open('firestore/[DEFAULT]/todo-witek-6a21e/main');
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction('clientMetadata', 'readonly');
        const store = tx.objectStore('clientMetadata');
        const all = store.getAll();
        all.onsuccess = () => resolve(all.result);
        all.onerror = () => resolve({ error: 'read failed' });
      };
      req.onerror = () => resolve({ error: 'open failed' });
    });
  });
  console.log('clientMetadata:', JSON.stringify(clientMeta));

  await browser.close();
}

main().catch(console.error);
