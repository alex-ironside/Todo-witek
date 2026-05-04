/**
 * Captures Firestore Listen channel response bodies to see what the server returns.
 */
import { chromium } from '@playwright/test';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  // Intercept Firestore Listen channel responses
  page.on('response', async (resp) => {
    if (resp.url().includes('firestore') && resp.url().includes('Listen')) {
      try {
        const body = await resp.text();
        console.log(`\n--- Firestore response (${resp.status()}) ---`);
        console.log('URL:', resp.url().slice(0, 120));
        console.log('Body (first 500):', body.slice(0, 500));
      } catch {
        // streaming response, can't read body
        console.log(`\n--- Firestore response (${resp.status()}) [streaming/unreadable] ---`);
        console.log('URL:', resp.url().slice(0, 120));
      }
    }
  });

  await page.goto('http://localhost:5173/todo-witek/', { waitUntil: 'networkidle' });

  await page.locator('[role="group"] button').filter({ hasText: /chmura/i }).click();
  await page.waitForTimeout(500);
  await page.locator('input[type="email"]').fill('alex@gmail.com');
  await page.locator('input[type="password"]').fill('zaq1@WSX');
  await page.locator('button[type="submit"]').click();

  await page.waitForFunction(() => !document.querySelector('input[type="password"]'), { timeout: 15000 });
  console.log('\nAuth complete — waiting 8s for Firestore responses...');
  await page.waitForTimeout(8000);

  await browser.close();
}

main().catch(console.error);
