import { test as base, expect, type Locator, type Page } from '@playwright/test';
import { STORAGE_MODE_KEY } from '../src/services/storageMode';
import { t } from '../src/i18n';
import { TEST_EMAIL, TEST_PASSWORD } from './global-setup';

export { TEST_EMAIL, TEST_PASSWORD };

export const test = base.extend({
  context: async ({ context }, use) => {
    await context.addInitScript((key) => {
      window.localStorage.setItem(key, 'api');
    }, STORAGE_MODE_KEY);
    await use(context);
  },
});

export { expect };

export const uniqueName = (prefix: string): string =>
  `${prefix} ${Date.now()}-${Math.floor(Math.random() * 100000)}`;

export const signIn = async (page: Page): Promise<void> => {
  await page.goto('/');
  await page.getByLabel(t.loginEmail).fill(TEST_EMAIL);
  await page.getByLabel(t.loginPassword).fill(TEST_PASSWORD);
  await page.getByRole('button', { name: t.loginSubmit, exact: true }).click();
  await expect(page.getByPlaceholder(t.todoPlaceholder)).toBeVisible();
};

export const signOut = async (page: Page): Promise<void> => {
  await page.getByRole('button', { name: t.settingsOpen, exact: true }).click();
  await page.getByRole('button', { name: t.signOut, exact: true }).click();
};

export const waitForDefaultCategories = async (page: Page): Promise<void> => {
  await expect(page.getByRole('tab', { name: 'Prywatne', exact: true })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Służbowe', exact: true })).toBeVisible();
};

// Every created todo gets a strictly decreasing position, so the
// just-created item is always the topmost row in whatever category tab
// is active. Callers that need to interact with a specific todo across a
// state change that hides its title text (e.g. inline edit) should grab
// this locator right after creation rather than filtering by text.
export const firstOpenRow = (page: Page): Locator =>
  page.getByTestId('open-todo-list').locator('li').first();

export const addTodo = async (page: Page, title: string): Promise<void> => {
  await page.getByPlaceholder(t.todoPlaceholder).fill(title);
  await page.getByRole('button', { name: t.todoAdd, exact: true }).click();
  await expect(page.getByText(title, { exact: true })).toBeVisible();
};

export const openOverflowMenuForRow = async (row: Locator): Promise<void> => {
  await row.getByRole('button', { name: t.moreActions, exact: true }).click();
  await expect(row.page().getByRole('menu')).toBeVisible();
};

export const closeOpenOverlay = async (page: Page): Promise<void> => {
  await page.keyboard.press('Escape');
};
