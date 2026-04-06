import { test, expect } from '@playwright/test';
import { uniqueTitle, createTestNote, deleteTestNote } from './helpers';

test.describe('View Note', () => {
  let notePath: string;
  const title = uniqueTitle('PW View Test');
  const body = '## Section\n\n- item one\n- item two\n\n**bold text** and `inline code`';

  test.beforeAll(async () => {
    notePath = await createTestNote(title, 'view,test', body);
  });

  test.afterAll(async () => {
    await deleteTestNote(notePath);
  });

  test('shows note content as rendered markdown', async ({ page }) => {
    await page.goto('/');
    await page.locator('.search-bar').fill(title.slice(0, 20));
    await page.locator('.note-list-item').first().click();

    await expect(page.locator('.note-viewer')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.markdown-body')).toContainText('Section');
    await expect(page.locator('.markdown-body')).toContainText('item one');
    await expect(page.locator('.markdown-body')).toContainText('bold text');
  });

  test('toolbar shows path and date', async ({ page }) => {
    await page.goto('/');
    await page.locator('.search-bar').fill(title.slice(0, 20));
    await page.locator('.note-list-item').first().click();

    await expect(page.locator('.note-viewer-path')).toContainText(notePath);
    await expect(page.locator('.note-viewer-date')).toHaveText(/\d{4}-\d{2}-\d{2}/);
  });

  test('edit and delete buttons are visible', async ({ page }) => {
    await page.goto('/');
    await page.locator('.search-bar').fill(title.slice(0, 20));
    await page.locator('.note-list-item').first().click();

    await expect(page.locator('.note-viewer')).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: 'Edit' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Delete' })).toBeVisible();
  });
});
