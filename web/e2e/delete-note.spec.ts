import { test, expect } from '@playwright/test';
import { fixtures, openFixture } from './helpers';

test.describe('Delete Note', () => {
  test('read-only viewer does not expose delete controls', async ({ page }) => {
    await openFixture(page, fixtures.jwt);
    await expect(page.getByRole('button', { name: 'Delete' })).toHaveCount(0);
    await expect(page.getByText(fixtures.jwt.path, { exact: true }).last()).toBeVisible();
  });
});
