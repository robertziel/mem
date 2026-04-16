import { test, expect } from '@playwright/test';
import { fixtures, gotoApp, openFixture, searchFor } from './helpers';

test.describe('Note List', () => {
  test('empty search shows the category picker with multiple top-level dirs', async ({ page }) => {
    await gotoApp(page);
    // Category rows use aria-label "Open category <name>".
    const categoryButtons = page.getByRole('button', { name: /^Open category / });
    await expect(categoryButtons.first()).toBeVisible();
    const count = await categoryButtons.count();
    expect(count).toBeGreaterThan(3);
  });

  test('typing a query hides categories and shows note rows', async ({ page }) => {
    await searchFor(page, 'docker compose');
    await expect(
      page
        .getByRole('button')
        .filter({ has: page.getByText('devops/docker/docker_compose.md', { exact: true }) }),
    ).toBeVisible();
    // Category rows must not show while a search is active
    await expect(page.getByRole('button', { name: /^Open category / })).toHaveCount(0);
  });

  test('tapping a category populates the search with its name', async ({ page }) => {
    await gotoApp(page);
    const devopsCategory = page.getByRole('button', { name: 'Open category devops' });
    await devopsCategory.click();
    await expect(page.getByPlaceholder('Search')).toHaveValue('devops');
    // The filtered list should now contain at least one devops note
    await expect(page.getByRole('button', { name: /^Open / }).first()).toBeVisible();
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
