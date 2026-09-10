import { test, expect, signIn, waitForDefaultCategories, addTodo, uniqueName } from './fixtures';
import { t } from '../src/i18n';

const openManageCategories = async (page: import('@playwright/test').Page) => {
  await page.getByRole('button', { name: t.menuOpen, exact: true }).click();
  await page.getByRole('button', { name: t.manageCategories, exact: true }).click();
  await expect(page.getByRole('dialog', { name: t.manageCategoriesTitle })).toBeVisible();
};

const createCategory = async (page: import('@playwright/test').Page, name: string) => {
  await page.getByPlaceholder(t.categoryNamePlaceholder).fill(name);
  await page.getByRole('button', { name: t.categoryAdd, exact: true }).click();
  await expect(
    page.getByRole('dialog', { name: t.manageCategoriesTitle }).getByText(name, { exact: true })
  ).toBeVisible();
};

test.describe('category management', () => {
  test('creates a category and it appears as a tab', async ({ page }) => {
    await signIn(page);
    await waitForDefaultCategories(page);

    const name = uniqueName('new-category');
    await openManageCategories(page);
    await createCategory(page, name);
    await page.keyboard.press('Escape');

    await expect(page.getByRole('tab', { name, exact: true })).toBeVisible();
  });

  test('renames a category', async ({ page }) => {
    await signIn(page);
    await waitForDefaultCategories(page);

    const origName = uniqueName('rename-before');
    const newName = uniqueName('rename-after');
    await openManageCategories(page);
    await createCategory(page, origName);

    const dialog = page.getByRole('dialog', { name: t.manageCategoriesTitle });
    await page.getByRole('button', { name: t.categoryRename(origName), exact: true }).click();
    await page
      .getByRole('textbox', { name: t.categoryRename(origName), exact: true })
      .fill(newName);
    await dialog.getByRole('button', { name: t.save, exact: true }).click();

    await expect(dialog.getByText(newName, { exact: true })).toBeVisible();
    await expect(dialog.getByText(origName, { exact: true })).toHaveCount(0);

    await page.keyboard.press('Escape');
    await expect(page.getByRole('tab', { name: newName, exact: true })).toBeVisible();
  });

  test('deleting a category reassigns its todos to uncategorized', async ({ page }) => {
    await signIn(page);
    await waitForDefaultCategories(page);

    const catA = uniqueName('reassign-keep');
    const catB = uniqueName('reassign-delete');
    await openManageCategories(page);
    await createCategory(page, catA);
    await createCategory(page, catB);
    await page.keyboard.press('Escape');

    await page.getByRole('tab', { name: catB, exact: true }).click();
    const title = uniqueName('orphaned-todo');
    await addTodo(page, title);

    await openManageCategories(page);
    const deleteBtn = page.getByRole('button', { name: t.categoryDelete(catB), exact: true });
    await deleteBtn.click();
    await deleteBtn.click();
    await expect(
      page.getByRole('dialog', { name: t.manageCategoriesTitle }).getByText(catB, { exact: true })
    ).toHaveCount(0);
    await page.keyboard.press('Escape');

    await expect(page.getByRole('tab', { name: catB, exact: true })).toHaveCount(0);
    const uncategorizedTab = page.getByRole('tab', { name: t.tabUncategorized, exact: true });
    await expect(uncategorizedTab).toBeVisible();
    await uncategorizedTab.click();
    await expect(page.getByText(title, { exact: true })).toBeVisible();
  });
});
