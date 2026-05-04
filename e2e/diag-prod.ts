/**
 * Diagnostic: capture all console output and network errors after login
 * to determine why onSnapshot is still hanging in production.
 */
import { chromium } from '@playwright/test';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  const allLogs: string[] = [];
  page.on('console', (msg) => {
    const entry = `[${msg.type()}] ${msg.text()}`;
    allLogs.push(entry);
    console.log(entry);
  });

  page.on('pageerror', (err) => {
    const entry = `[pageerror] ${err.message}`;
    allLogs.push(entry);
    console.log(entry);
  });

  page.on('requestfailed', (req) => {
    const entry = `[requestfailed] ${req.url()} — ${req.failure()?.errorText}`;
    allLogs.push(entry);
    console.log(entry);
  });

  await page.goto('https://alex-ironside.github.io/Todo-witek/', { waitUntil: 'networkidle' });

  const chmuraBtn = page.locator('[role="group"] button').filter({ hasText: /chmura/i });
  if (await chmuraBtn.isVisible()) {
    await chmuraBtn.click();
    await page.waitForTimeout(500);
  }

  await page.locator('input[type="email"]').fill('alex@gmail.com');
  await page.locator('input[type="password"]').fill('zaq1@WSX');
  await page.locator('button[type="submit"]').click();

  await page.waitForFunction(
    () => !document.querySelector('input[type="password"]'),
    { timeout: 20000 }
  );
  console.log('=== Auth complete ===');

  // Wait 10 seconds and capture everything
  await page.waitForTimeout(10000);

  const body = await page.locator('body').textContent() ?? '';
  console.log('\n=== Final body ===');
  console.log(body.slice(0, 500));
  console.log('\n=== All console logs ===');
  allLogs.forEach((l) => console.log(l));

  await browser.close();
}

main().catch((err) => {
  console.error('Script error:', err);
  process.exitCode = 1;
});
