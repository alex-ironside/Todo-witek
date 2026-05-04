/**
 * Production smoke test: logs in via Firebase (cloud mode) and verifies
 * that "Ładowanie…" resolves — either todos load, the empty-state message
 * appears, or an error banner is shown instead of hanging indefinitely.
 */
import { chromium } from '@playwright/test';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  const consoleLogs: string[] = [];
  page.on('console', (msg) => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));

  console.log('Opening production URL...');
  await page.goto('https://alex-ironside.github.io/Todo-witek/', { waitUntil: 'networkidle' });

  // Ensure cloud (Chmura) mode is selected
  const chmuraBtn = page.locator('[role="group"] button').filter({ hasText: /chmura/i });
  if (await chmuraBtn.isVisible()) {
    await chmuraBtn.click();
    await page.waitForTimeout(500);
  }

  // Fill login form
  await page.locator('input[type="email"]').fill('alex@gmail.com');
  await page.locator('input[type="password"]').fill('zaq1@WSX');
  await page.locator('button[type="submit"]').click();

  // Wait for auth to complete (login form disappears)
  await page.waitForFunction(
    () => !document.querySelector('input[type="password"]'),
    { timeout: 20000 }
  );
  console.log('Auth complete.');

  // Poll for up to 15 seconds for loading to resolve
  let resolved = false;
  for (let i = 0; i < 15; i++) {
    await page.waitForTimeout(1000);
    const body = await page.locator('body').textContent() ?? '';
    const loading = body.includes('adowanie');
    console.log(`t+${i + 1}s: loading=${loading}`);
    if (!loading) {
      resolved = true;
      console.log('Loading resolved. Body excerpt:', body.slice(0, 400));
      break;
    }
  }

  if (!resolved) {
    const body = await page.locator('body').textContent() ?? '';
    console.error('FAIL: Still showing "Ładowanie…" after 15 seconds.');
    console.error('Body:', body.slice(0, 400));
    process.exitCode = 1;
  } else {
    console.log('PASS: Loading state resolved successfully.');
  }

  const errLogs = consoleLogs.filter((l) => l.startsWith('[error]'));
  if (errLogs.length) {
    console.log('Console errors observed:', errLogs);
  }

  await browser.close();
}

main().catch((err) => {
  console.error('Script error:', err);
  process.exitCode = 1;
});
