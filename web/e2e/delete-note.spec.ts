import { test, expect } from '@playwright/test';
import { uniqueTitle, createTestNote, deleteTestNote } from './helpers';

test.describe('Delete Note', () => {
  test('cancel dismisses modal and keeps note', async ({ page }) => {
    const title = uniqueTitle('PW Del Cancel');
    const path = await createTestNote(title);

    try {
      await page.goto('/');
      await page.locator('.search-bar').fill(title.slice(0, 20));
      await page.locator('.note-list-item').first().click();
      await expect(page.locator('.note-viewer')).toBeVisible({ timeout: 5000 });

      await page.getByRole('button', { name: 'Delete' }).click();
      await expect(page.locator('.modal')).toBeVisible();
      await expect(page.locator('.modal')).toContainText(path);

      // Cancel
      await page.locator('.modal').getByRole('button', { name: 'Cancel' }).click();
      await expect(page.locator('.modal')).not.toBeVisible();
      await expect(page.locator('.note-viewer')).toBeVisible();
    } finally {
      await deleteTestNote(path);
    }
  });

  test('clicking overlay dismisses modal', async ({ page }) => {
    const title = uniqueTitle('PW Del Overlay');
    const path = await createTestNote(title);

    try {
      await page.goto('/');
      await page.locator('.search-bar').fill(title.slice(0, 20));
      await page.locator('.note-list-item').first().click();
      await expect(page.locator('.note-viewer')).toBeVisible({ timeout: 5000 });

      await page.getByRole('button', { name: 'Delete' }).click();
      await expect(page.locator('.modal')).toBeVisible();

      // Click overlay (top-left corner, outside modal)
      await page.locator('.modal-overlay').click({ position: { x: 5, y: 5 } });
      await expect(page.locator('.modal')).not.toBeVisible();
    } finally {
      await deleteTestNote(path);
    }
  });

  test('confirm deletes note and returns to list', async ({ page }) => {
    const title = uniqueTitle('PW Del Confirm');
    const path = await createTestNote(title);

    await page.goto('/');
    await page.locator('.search-bar').fill(title.slice(0, 20));
    await page.locator('.note-list-item').first().click();
    await expect(page.locator('.note-viewer')).toBeVisible({ timeout: 5000 });

    await page.getByRole('button', { name: 'Delete' }).click();
    await expect(page.locator('.modal')).toBeVisible();

    await page.locator('.modal').getByRole('button', { name: 'Delete' }).click();

    // Should return to list with placeholder
    await expect(page.locator('.modal')).not.toBeVisible({ timeout: 10000 });
    await expect(page.locator('.note-viewer')).not.toBeVisible();

    // Wait for list to refresh, then search for the deleted note
    await expect(page.locator('.note-list-item').first()).toBeVisible({ timeout: 10000 });
    await page.locator('.search-bar').fill(title);
    await expect(page.locator('.note-list-empty')).toBeVisible({ timeout: 10000 });
  });
});
