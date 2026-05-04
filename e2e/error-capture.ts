/**
 * Captures the onSnapshot error message to diagnose root cause.
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
  console.log('Auth complete — waiting 10s for Firestore error...');
  await page.waitForTimeout(10000);

  console.log('\nAll console logs:');
  logs.forEach((l) => console.log(l));

  await browser.close();
}

main().catch(console.error);
