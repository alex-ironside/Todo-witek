/**
 * Runs headed (visible browser) to observe the UI state.
 * Also injects a Firestore query to test if data comes back.
 */
import { chromium } from '@playwright/test';

async function main() {
  const browser = await chromium.launch({ headless: false, slowMo: 200 });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  const logs: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() !== 'debug') {
      logs.push(`[${msg.type()}] ${msg.text()}`);
    }
  });

  await page.goto('http://localhost:5173/todo-witek/', { waitUntil: 'networkidle' });
  await page.locator('[role="group"] button').filter({ hasText: /chmura/i }).click();
  await page.waitForTimeout(500);
  await page.locator('input[type="email"]').fill('alex@gmail.com');
  await page.locator('input[type="password"]').fill('zaq1@WSX');
  await page.locator('button[type="submit"]').click();

  // Wait for auth
  await page.waitForFunction(() => !document.querySelector('input[type="password"]'), { timeout: 15000 });
  console.log('Auth done');

  // Wait to observe
  await page.waitForTimeout(5000);

  const body = await page.locator('body').textContent();
  console.log('Body:', body?.slice(0, 400));
  console.log('Logs:', logs);

  // Take screenshot
  await page.screenshot({ path: '/home/alex/Documents/priv/Todo-witek/e2e/screenshots/headed-state.png' });

  await page.waitForTimeout(2000);
  await browser.close();
}

main().catch(console.error);
