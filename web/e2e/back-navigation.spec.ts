import { test, expect } from '@playwright/test';
import { gotoApp, searchFor } from './helpers';

// ---------------------------------------------------------------------------
// IMMUTABLE REGRESSION TESTS — the Back button (`‹`) in the mobile
// bottom bar walks the user back up the category / directory hierarchy
// by stripping the last segment of the search query. It also still
// returns from the detail view to the list (pre-existing behavior).
// At the top-level CategoryList (empty query, list pane) the button
// is hidden so there is never a no-op affordance.
// ---------------------------------------------------------------------------
test.describe('Back navigation (hierarchical)', () => {
  test.beforeEach(async ({ page }) => {
    // All assertions are about the mobile bottom bar
    await page.setViewportSize({ width: 390, height: 844 });
  });

  test('at the root (empty query) the Back button is NOT rendered', async ({ page }) => {
    await gotoApp(page);
    await expect(page.getByRole('button', { name: 'Back to list' })).toHaveCount(0);
  });

  test('typing an exact top-level dir shows Back; pressing it returns to CategoryList', async ({ page }) => {
    await searchFor(page, 'ruby');
    // directory browser shows subdir rows
    await expect(page.getByRole('button', { name: /^Open category / }).first()).toBeVisible();
    const back = page.getByRole('button', { name: 'Back to list' });
    await expect(back).toBeVisible();
    await back.click();
    // query empties, CategoryList reappears, Back hidden again
    await expect(page.getByPlaceholder('Search')).toHaveValue('');
    await expect(page.getByRole('button', { name: /^Open category / }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Back to list' })).toHaveCount(0);
  });

  test('drilling down then pressing Back walks one level up, not all the way', async ({ page }) => {
    await searchFor(page, 'ruby');
    // pick the first subdir and drill in
    const firstSubdir = page.getByRole('button', { name: /^Open category / }).first();
    const subdirLabel = (await firstSubdir.getAttribute('aria-label')) ?? '';
    const subdirName = subdirLabel.replace(/^Open category /, '');
    await firstSubdir.click();
    await expect(page.getByPlaceholder('Search')).toHaveValue(`ruby ${subdirName}`);
    // one Back press → back to "ruby"
    await page.getByRole('button', { name: 'Back to list' }).click();
    await expect(page.getByPlaceholder('Search')).toHaveValue('ruby');
    // another Back press → root, button disappears
    await page.getByRole('button', { name: 'Back to list' }).click();
    await expect(page.getByPlaceholder('Search')).toHaveValue('');
    await expect(page.getByRole('button', { name: 'Back to list' })).toHaveCount(0);
  });

  test('from note detail, Back returns to the list/dir pane and keeps the query', async ({ page }) => {
    await searchFor(page, 'hooks');
    // open the first note (not a category)
    const noteRows = page.locator(
      '[role="button"][aria-label^="Open "]:not([aria-label^="Open category"])',
    );
    await noteRows.first().click();
    await expect(page.locator('.mem-markdown').first()).toBeVisible();
    // Back → leaves detail view, keeps the "hooks" query
    await page.getByRole('button', { name: 'Back to list' }).click();
    await expect(page.locator('.mem-markdown')).toHaveCount(0);
    await expect(page.getByPlaceholder('Search')).toHaveValue('hooks');
    // Back is still visible because the query is non-empty
    await expect(page.getByRole('button', { name: 'Back to list' })).toBeVisible();
  });
});
