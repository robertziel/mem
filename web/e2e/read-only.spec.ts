import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers';

test.describe('Read-only app (no mutation UI)', () => {
  test('no "New" or "+ Add" affordance exists anywhere on the page', async ({ page }) => {
    await gotoApp(page);
    await expect(page.getByRole('button', { name: /^\+\s?New$/ })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Add/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Create/i })).toHaveCount(0);
  });

  test('no title/body form fields are rendered', async ({ page }) => {
    await gotoApp(page);
    await expect(page.locator('input[placeholder="Title"]')).toHaveCount(0);
    await expect(page.locator('textarea')).toHaveCount(0);
  });
});
