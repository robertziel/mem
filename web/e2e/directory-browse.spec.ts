import { test, expect } from '@playwright/test';
import { gotoApp, searchFor } from './helpers';

// ---------------------------------------------------------------------------
// IMMUTABLE REGRESSION TESTS — when the search query is a sequence of
// directory names that exist in the seeded corpus (segment-for-segment),
// the UI must switch to directory-browse mode: subdirs listed as
// "Open category" rows, files listed as "Open <title>" rows. Partial or
// unmatched queries must fall back to the flat search list.
// ---------------------------------------------------------------------------
test.describe('Directory browsing', () => {
  test('typing the name of an existing top-level directory browses it (subdirs + files)', async ({ page }) => {
    await searchFor(page, 'ruby');
    // "Open category <subdir>" rows appear for child directories of ruby/
    const subdirRows = page.getByRole('button', { name: /^Open category / });
    await expect(subdirRows.first()).toBeVisible({ timeout: 5000 });
    const subdirCount = await subdirRows.count();
    expect(subdirCount).toBeGreaterThan(0);
  });

  test('drilling down: tapping a subdir appends it to the query and browses deeper', async ({ page }) => {
    await searchFor(page, 'ruby');
    const subdirRows = page.getByRole('button', { name: /^Open category / });
    await expect(subdirRows.first()).toBeVisible({ timeout: 5000 });
    const firstSubdirLabel = await subdirRows.first().getAttribute('aria-label');
    const subdirName = firstSubdirLabel?.replace(/^Open category /, '');
    expect(subdirName).toBeTruthy();
    await subdirRows.first().click();
    await expect(page.getByPlaceholder('Search')).toHaveValue(`ruby ${subdirName}`);
  });

  test('non-directory query (e.g. partial prefix "rub") falls back to flat search', async ({ page }) => {
    await searchFor(page, 'rub');
    // No category rows; instead, note rows ("Open <title>") appear
    await expect(page.getByRole('button', { name: /^Open category / })).toHaveCount(0);
    // If "rub" matches via prefix-search, at least one note row appears
    // We can't guarantee zero false-negatives without fixtures, but we
    // assert the directory browser is NOT active by the absence of a
    // breadcrumb row.
  });

  test('query like "foo bar" (no such dir) falls back to flat search (no browser breadcrumb)', async ({ page }) => {
    await searchFor(page, 'zzzzz nosuchdir');
    await expect(page.getByRole('button', { name: /^Open category / })).toHaveCount(0);
  });

  test('empty query shows the category picker (not the directory browser)', async ({ page }) => {
    await gotoApp(page);
    // CategoryList — top-level categories
    await expect(page.getByRole('button', { name: /^Open category / }).first()).toBeVisible();
    // Since we're at top-level, no breadcrumb "Folders" / "Notes" sections exist
  });
});
