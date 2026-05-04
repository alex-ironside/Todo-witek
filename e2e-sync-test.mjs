/**
 * End-to-end Firestore sync test.
 * Adds a todo on local dev, verifies it appears on GH Pages.
 */
import { chromium } from 'playwright';

const EMAIL = 'alex@gmail.com';
const PASSWORD = 'zaq1@WSX';
const LOCAL_URL = 'http://localhost:5173/todo-witek/';
const PROD_URL = 'https://alex-ironside.github.io/Todo-witek/';
const UNIQUE_TITLE = `sync-test-${Date.now()}`;
const SYNC_TIMEOUT_MS = 10_000;

async function loginAndSwitchToCloud(page, url, label) {
  console.log(`[${label}] Navigating to ${url}`);
  await page.goto(url, { waitUntil: 'networkidle' });

  // Switch to cloud mode if not already (button with text "Chmura")
  const cloudBtn = page.getByRole('button', { name: 'Chmura' });
  const isAlreadyCloud = await cloudBtn.evaluate(el =>
    el.classList.contains('primary')
  ).catch(() => false);

  if (!isAlreadyCloud) {
    console.log(`[${label}] Switching to cloud mode`);
    await cloudBtn.click();
    // After switching mode, a login form should appear (or we might already be logged in)
    await page.waitForTimeout(500);
  }

  // Check if login form is visible
  const emailInput = page.getByPlaceholder('E-mail');
  const loginVisible = await emailInput.isVisible().catch(() => false);

  if (loginVisible) {
    console.log(`[${label}] Logging in`);
    await emailInput.fill(EMAIL);
    await page.getByPlaceholder('Hasło').fill(PASSWORD);
    await page.getByRole('button', { name: 'Zaloguj' }).click();
    // Wait for login to complete (login form disappears)
    await page.waitForSelector('.login', { state: 'detached', timeout: 10_000 });
    console.log(`[${label}] Logged in`);
  } else {
    console.log(`[${label}] Already logged in or login not required`);
  }

  // Ensure we are in cloud mode after login (the toggle might reset)
  const cloudBtnAfterLogin = page.getByRole('button', { name: 'Chmura' });
  const cloudActive = await cloudBtnAfterLogin.evaluate(el =>
    el.classList.contains('primary') || el.getAttribute('aria-pressed') === 'true'
  ).catch(() => false);

  if (!cloudActive) {
    console.log(`[${label}] Re-selecting cloud mode after login`);
    await cloudBtnAfterLogin.click();
    await page.waitForTimeout(500);
  }
}

async function run() {
  const browser1 = await chromium.launch({ headless: true });
  const browser2 = await chromium.launch({ headless: true });

  try {
    // --- Step 1: Local dev — add todo ---
    const ctx1 = await browser1.newContext();
    const page1 = await ctx1.newPage();

    await loginAndSwitchToCloud(page1, LOCAL_URL, 'LOCAL');

    console.log(`[LOCAL] Adding todo: "${UNIQUE_TITLE}"`);
    const todoInput = page1.getByPlaceholder('Dodaj zadanie…');
    await todoInput.fill(UNIQUE_TITLE);
    await page1.getByRole('button', { name: 'Dodaj' }).click();

    // Verify it appears locally
    await page1.waitForSelector(`text="${UNIQUE_TITLE}"`, { timeout: 5_000 });
    console.log(`[LOCAL] Todo visible on local dev. ✓`);

    // --- Step 2: GH Pages — verify sync ---
    const ctx2 = await browser2.newContext();
    const page2 = await ctx2.newPage();

    await loginAndSwitchToCloud(page2, PROD_URL, 'PROD');

    console.log(`[PROD] Waiting up to ${SYNC_TIMEOUT_MS}ms for todo to appear via Firestore sync…`);

    let found = false;
    const deadline = Date.now() + SYNC_TIMEOUT_MS;
    while (Date.now() < deadline) {
      found = await page2.locator(`text="${UNIQUE_TITLE}"`).isVisible().catch(() => false);
      if (found) break;
      await page2.waitForTimeout(500);
    }

    if (found) {
      console.log(`[PROD] Todo "${UNIQUE_TITLE}" found on GH Pages. ✓`);
      console.log('\nRESULT: PASS');
    } else {
      // Gather diagnostic info
      const localContent = await page1.locator('body').innerText().catch(() => '(error)');
      const prodContent = await page2.locator('body').innerText().catch(() => '(error)');
      console.error(`[PROD] Todo NOT found within ${SYNC_TIMEOUT_MS}ms.`);
      console.error('\n--- LOCAL page content ---');
      console.error(localContent.slice(0, 1000));
      console.error('\n--- PROD page content ---');
      console.error(prodContent.slice(0, 1000));
      console.error('\nRESULT: FAIL');
      process.exit(1);
    }
  } finally {
    await browser1.close();
    await browser2.close();
  }
}

run().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
