/**
 * Tests whether Firestore onSnapshot fires at all after login,
 * and how long it takes to resolve the loading state.
 */
import { chromium } from '@playwright/test';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  const logs: string[] = [];
  page.on('console', (msg) => logs.push(`[${msg.type()}] ${msg.text()}`));

  await page.goto('http://localhost:5173/todo-witek/', { waitUntil: 'networkidle' });

  // Switch to cloud
  await page.locator('[role="group"] button').filter({ hasText: /chmura/i }).click();
  await page.waitForTimeout(500);

  // Login
  await page.locator('input[type="email"]').fill('alex@gmail.com');
  await page.locator('input[type="password"]').fill('zaq1@WSX');
  await page.locator('button[type="submit"]').click();

  // Wait for auth complete (password field disappears)
  await page.waitForFunction(() => !document.querySelector('input[type="password"]'), { timeout: 15000 });
  console.log('Auth complete');

  // Poll for loading state to resolve for up to 20 seconds
  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(1000);
    const body = await page.locator('body').textContent();
    const hasLoading = body?.includes('adowanie') ?? false;
    console.log(`t+${i + 1}s: loading=${hasLoading}`);
    if (!hasLoading) {
      console.log('Loading resolved! Body:', body?.slice(0, 300));
      break;
    }
  }

  const finalBody = await page.locator('body').textContent();
  console.log('\nFinal body:', finalBody?.slice(0, 400));
  console.log('\nConsole logs:', logs.slice(0, 20));

  await browser.close();
}

main().catch(console.error);
