import { test, expect } from '@playwright/test';
import { fixtures, gotoApp, openFixture } from './helpers';

test.describe('Note List', () => {
  test('loads the local snapshot and displays note rows', async ({ page }) => {
    await gotoApp(page);
    await expect(page.getByRole('button').first()).toBeVisible();
    const count = await page.getByRole('button').count();
    expect(count).toBeGreaterThan(1);
  });

  test('opening a seeded note shows its details', async ({ page }) => {
    await openFixture(page, fixtures.dockerCompose);
    await expect(page.getByText(fixtures.dockerCompose.title).last()).toBeVisible();
    // Detail pane shows the path keywords (top dir + subdirs + filename tokens)
    // instead of an "Updated {date}" stamp.
    await expect(page.getByText('devops', { exact: true }).last()).toBeVisible();
    await expect(page.getByText('docker', { exact: true }).last()).toBeVisible();
  });
});
