import { test, expect } from '@playwright/test';

test.describe('Note List', () => {
  test('loads and displays notes in sidebar', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.note-list-item').first()).toBeVisible();
    const count = await page.locator('.note-list-item').count();
    expect(count).toBeGreaterThan(0);
  });

  test('each item shows title, path, and date', async ({ page }) => {
    await page.goto('/');
    const first = page.locator('.note-list-item').first();
    await expect(first.locator('.note-list-item-title')).not.toBeEmpty();
    await expect(first.locator('.note-list-item-path')).not.toBeEmpty();
    await expect(first.locator('.note-list-item-date')).toHaveText(/\d{4}-\d{2}-\d{2}/);
  });

  test('shows placeholder when no note is selected', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.main-placeholder')).toContainText('Select a note to view');
  });

  test('clicking a note selects it and shows viewer', async ({ page }) => {
    await page.goto('/');
    const first = page.locator('.note-list-item').first();
    await first.click();
    await expect(first).toHaveClass(/selected/);
    await expect(page.locator('.note-viewer')).toBeVisible();
  });
});
