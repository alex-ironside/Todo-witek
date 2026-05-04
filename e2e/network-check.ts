/**
 * Captures network requests to Firebase/Firestore during login flow
 * to see what's actually happening at the network level.
 */
import { chromium } from '@playwright/test';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  const networkLogs: string[] = [];
  page.on('request', (req) => {
    const url = req.url();
    if (url.includes('firestore') || url.includes('firebase') || url.includes('google')) {
      networkLogs.push(`REQ  ${req.method()} ${url.slice(0, 150)}`);
    }
  });
  page.on('response', (resp) => {
    const url = resp.url();
    if (url.includes('firestore') || url.includes('firebase') || url.includes('google')) {
      networkLogs.push(`RES  ${resp.status()} ${url.slice(0, 150)}`);
    }
  });

  await page.goto('http://localhost:5173/todo-witek/', { waitUntil: 'networkidle', timeout: 15000 });

  // Switch to cloud mode
  await page.locator('[role="group"] button').filter({ hasText: /chmura/i }).click();
  await page.waitForTimeout(500);

  // Login
  await page.locator('input[type="email"]').fill('alex@gmail.com');
  await page.locator('input[type="password"]').fill('zaq1@WSX');
  await page.locator('button[type="submit"]').click();

  // Wait for auth + Firestore to settle
  await page.waitForTimeout(10000);

  const bodyText = await page.locator('body').textContent();
  console.log('Page body:', bodyText?.slice(0, 400));

  console.log('\nNetwork logs:');
  networkLogs.forEach((l) => console.log(l));

  await browser.close();
}

main().catch(console.error);
