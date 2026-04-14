import { test, expect } from '@playwright/test';
import { fixtures, openFixture } from './helpers';

test.describe('Edit Note', () => {
  test('read-only viewer does not expose edit controls', async ({ page }) => {
    await openFixture(page, fixtures.useEffect);
    await expect(page.getByRole('button', { name: 'Edit' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Save' })).toHaveCount(0);
    await expect(page.locator('textarea')).toHaveCount(0);
  });
});
