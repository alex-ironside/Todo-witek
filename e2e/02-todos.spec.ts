import {
  test,
  expect,
  signIn,
  waitForDefaultCategories,
  addTodo,
  firstOpenRow,
  openOverflowMenuForRow,
  closeOpenOverlay,
  uniqueName,
} from './fixtures';
import { t } from '../src/i18n';

test.describe('todo CRUD', () => {
  test('creates a todo in the default category and it appears in the list', async ({ page }) => {
    await signIn(page);
    await waitForDefaultCategories(page);
    await expect(page.getByRole('tab', { name: 'Prywatne', exact: true })).toHaveAttribute(
      'aria-selected',
      'true'
    );

    const title = uniqueName('default-cat-todo');
    await addTodo(page, title);
  });

  test('creates a todo with a chosen category and a reminder, and both persist after reload', async ({
    page,
  }) => {
    await signIn(page);
    await waitForDefaultCategories(page);
    await page.getByRole('tab', { name: 'Służbowe', exact: true }).click();

    const title = uniqueName('reminder-todo');
    await addTodo(page, title);

    const row = firstOpenRow(page);
    await openOverflowMenuForRow(row);
    await page.getByRole('menuitem', { name: t.remind, exact: true }).click();

    await expect(page.getByRole('dialog', { name: t.reminderSheetTitle })).toBeVisible();
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const pad = (n: number) => String(n).padStart(2, '0');
    const value = `${future.getFullYear()}-${pad(future.getMonth() + 1)}-${pad(
      future.getDate()
    )}T${pad(future.getHours())}:${pad(future.getMinutes())}`;
    await page.getByTestId('reminder-input').fill(value);
    await page.getByRole('button', { name: t.reminderAdd, exact: true }).click();
    await expect(page.getByTestId('bell-icon')).toBeVisible();

    await closeOpenOverlay(page);
    const rowWithReminder = page.locator('li').filter({ hasText: title });
    await expect(rowWithReminder.getByTestId('reminder-bell')).toBeVisible();

    await page.reload();
    await expect(page.getByRole('tab', { name: 'Służbowe', exact: true })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    const rowAfterReload = page.locator('li').filter({ hasText: title });
    await expect(rowAfterReload).toBeVisible();
    await expect(rowAfterReload.getByTestId('reminder-bell')).toBeVisible();
  });

  test('toggles a todo done and the state persists after reload', async ({ page }) => {
    await signIn(page);
    await waitForDefaultCategories(page);

    const title = uniqueName('toggle-todo');
    await addTodo(page, title);
    await page.getByRole('checkbox', { name: t.markDone(title), exact: true }).click();

    const doneToggle = page.getByRole('button', { name: /Wykonane/ });
    await doneToggle.click();
    const doneBody = page.getByTestId('done-body');
    await expect(doneBody.getByText(title, { exact: true })).toBeVisible();
    await expect(page.getByPlaceholder(t.todoPlaceholder)).toBeVisible();
    await expect(
      page.getByTestId('open-todo-list').getByText(title, { exact: true })
    ).toHaveCount(0);

    await page.reload();
    await expect(page.getByPlaceholder(t.todoPlaceholder)).toBeVisible();
    await page.getByRole('button', { name: /Wykonane/ }).click();
    await expect(page.getByTestId('done-body').getByText(title, { exact: true })).toBeVisible();
  });

  test('edits a todo title', async ({ page }) => {
    await signIn(page);
    await waitForDefaultCategories(page);

    const oldTitle = uniqueName('edit-before');
    const newTitle = uniqueName('edit-after');
    await addTodo(page, oldTitle);

    const row = firstOpenRow(page);
    await openOverflowMenuForRow(row);
    await page.getByRole('menuitem', { name: t.edit, exact: true }).click();

    await row.locator('input[type="text"]').fill(newTitle);
    await row.getByRole('button', { name: t.save, exact: true }).click();

    await expect(page.getByText(newTitle, { exact: true })).toBeVisible();
    await expect(page.getByText(oldTitle, { exact: true })).toHaveCount(0);
  });

  test('deletes a todo', async ({ page }) => {
    await signIn(page);
    await waitForDefaultCategories(page);

    const title = uniqueName('delete-todo');
    await addTodo(page, title);

    const row = firstOpenRow(page);
    await openOverflowMenuForRow(row);
    await page.getByRole('menuitem', { name: t.delete, exact: true }).click();
    await page.getByRole('menuitem', { name: t.deleteConfirm, exact: true }).click();

    await expect(page.getByText(title, { exact: true })).toHaveCount(0);
  });

  test('reorders two todos via the keyboard and the order persists after reload', async ({
    page,
  }) => {
    await signIn(page);
    await waitForDefaultCategories(page);

    const titleA = uniqueName('reorder-a');
    const titleB = uniqueName('reorder-b');
    await addTodo(page, titleA);
    await addTodo(page, titleB);

    const list = page.getByTestId('open-todo-list');
    const topRow = list.locator('li').nth(0);
    const secondRow = list.locator('li').nth(1);
    await expect(topRow).toContainText(titleB);
    await expect(secondRow).toContainText(titleA);

    await secondRow.focus();
    await page.keyboard.press('Space');
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('Space');

    await expect(list.locator('li').nth(0)).toContainText(titleA);
    await expect(list.locator('li').nth(1)).toContainText(titleB);

    await page.reload();
    await expect(page.getByTestId('open-todo-list').locator('li').nth(0)).toContainText(titleA);
    await expect(page.getByTestId('open-todo-list').locator('li').nth(1)).toContainText(titleB);
  });
});
