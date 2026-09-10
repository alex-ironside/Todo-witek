import { test, expect, signIn, signOut } from './fixtures';
import { t } from '../src/i18n';

test.describe('auth gate', () => {
  test('shows the login screen when unauthenticated', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: t.loginTitle })).toBeVisible();
    await expect(page.getByLabel(t.loginEmail)).toBeVisible();
    await expect(page.getByLabel(t.loginPassword)).toBeVisible();
    await expect(page.getByPlaceholder(t.todoPlaceholder)).toHaveCount(0);
  });

  test('logging in shows the main list', async ({ page }) => {
    await signIn(page);
    await expect(page.getByText(t.brand, { exact: true }).first()).toBeVisible();
    await expect(page.getByPlaceholder(t.todoPlaceholder)).toBeVisible();
  });

  test('logging out returns to the login screen', async ({ page }) => {
    await signIn(page);
    await signOut(page);
    await expect(page.getByRole('heading', { name: t.loginTitle })).toBeVisible();
    await expect(page.getByLabel(t.loginEmail)).toBeVisible();

    await page.reload();
    await expect(page.getByRole('heading', { name: t.loginTitle })).toBeVisible();
  });
});
