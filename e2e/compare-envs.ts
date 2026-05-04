/**
 * Comparison script: logs todos visible on local dev vs production
 * for the same credentials, to diagnose sync issues.
 */

import { chromium, type Browser, type Page } from '@playwright/test';

const LOCAL_URL = 'http://localhost:5173/todo-witek/';
const PROD_URL = 'https://alex-ironside.github.io/Todo-witek/';
const EMAIL = 'alex@gmail.com';
const PASSWORD = 'zaq1@WSX';

// Wait until the login form is completely gone (user is authenticated).
async function waitForLoggedIn(page: Page, label: string) {
  console.log(`[${label}] Waiting for login form to disappear (auth complete)...`);
  try {
    await page.waitForFunction(
      () => !document.querySelector('input[type="password"]'),
      { timeout: 20000 }
    );
    console.log(`[${label}] Auth complete — login form gone.`);
  } catch {
    const bodySnip = (await page.locator('body').textContent())?.slice(0, 400);
    console.log(`[${label}] Timeout — login form still present. Body: ${bodySnip}`);
  }
}

async function getEnvState(browser: Browser, url: string, label: string) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  console.log(`\n=== ${label} (${url}) ===`);

  const consoleLogs: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warn') {
      consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
    }
  });

  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

  // Check initial mode
  const lsModeBefore = await page.evaluate(() => localStorage.getItem('todo-witek:storage-mode'));
  console.log(`[${label}] storage-mode before:`, JSON.stringify(lsModeBefore));

  // Switch to cloud mode if needed
  const cloudBtn = page.locator('[role="group"] button').filter({ hasText: /chmura/i });
  const cloudPressed = await cloudBtn.getAttribute('aria-pressed').catch(() => null);
  if (cloudPressed !== 'true') {
    console.log(`[${label}] Clicking Chmura (cloud) button...`);
    await cloudBtn.click();
    await page.waitForTimeout(800);
  }

  // Fill and submit login form
  const emailInput = page.locator('input[type="email"]');
  if (await emailInput.isVisible({ timeout: 5000 }).catch(() => false)) {
    console.log(`[${label}] Filling login form...`);
    await emailInput.fill(EMAIL);
    await page.locator('input[type="password"]').fill(PASSWORD);
    await page.locator('button[type="submit"]').click();
    await waitForLoggedIn(page, label);
  } else {
    console.log(`[${label}] No email input visible.`);
    const body = await page.locator('body').textContent();
    console.log(`[${label}] Body:`, body?.slice(0, 300));
  }

  // Wait for Firestore data to settle
  await page.waitForTimeout(3000);

  await page.screenshot({ path: `/home/alex/Documents/priv/Todo-witek/e2e/screenshots/${label}-logged-in.png` });

  const lsModeAfter = await page.evaluate(() => localStorage.getItem('todo-witek:storage-mode'));
  console.log(`[${label}] storage-mode after:`, JSON.stringify(lsModeAfter));

  const bodyText = (await page.locator('body').textContent()) ?? '';
  console.log(`[${label}] Page body (first 800):`, bodyText.slice(0, 800));

  // Count all list items
  const liCount = await page.locator('li').count();
  console.log(`[${label}] <li> count:`, liCount);
  if (liCount > 0) {
    const texts = await page.locator('li').allTextContents();
    console.log(`[${label}] <li> texts:`, texts.map(t => t.trim().slice(0, 80)));
  }

  const errors = consoleLogs.filter(l => l.startsWith('[error]'));
  const warns = consoleLogs.filter(l => l.startsWith('[warn]'));
  if (errors.length > 0) console.log(`[${label}] Console errors:`, errors);
  if (warns.length > 0) console.log(`[${label}] Console warns:`, warns.slice(0, 5));

  await ctx.close();
  return { label, url, lsModeAfter, bodyText, liCount, consoleErrors: errors };
}

async function main() {
  const { mkdirSync } = await import('fs');
  mkdirSync('/home/alex/Documents/priv/Todo-witek/e2e/screenshots', { recursive: true });

  const browser = await chromium.launch({ headless: true });
  try {
    const local = await getEnvState(browser, LOCAL_URL, 'local');
    const prod = await getEnvState(browser, PROD_URL, 'prod');

    console.log('\n=== COMPARISON SUMMARY ===');
    console.log('Local mode:', local.lsModeAfter, '| todos (li):', local.liCount, '| errors:', local.consoleErrors.length);
    console.log('Prod  mode:', prod.lsModeAfter,  '| todos (li):', prod.liCount,  '| errors:', prod.consoleErrors.length);

    if (local.liCount !== prod.liCount) {
      console.log('MISMATCH detected: different item counts!');
    } else if (local.liCount === 0) {
      console.log('Both show 0 items — either no todos exist or both fail to load.');
    } else {
      console.log('Item counts match.');
    }
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
