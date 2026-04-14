import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers';

test.describe('Create Note', () => {
  test('read-only app does not expose a create action', async ({ page }) => {
    await gotoApp(page);
    await expect(page.getByText('Read-only')).toBeVisible();
    await expect(page.getByRole('button', { name: '+ New' })).toHaveCount(0);
  });

  test('read-only app does not render creation fields', async ({ page }) => {
    await gotoApp(page);
    await expect(page.getByLabel('Search notes')).toBeVisible();
    await expect(page.locator('input[placeholder="Title"]')).toHaveCount(0);
    await expect(page.locator('textarea')).toHaveCount(0);
  });
});
