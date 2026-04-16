import { test, expect } from '@playwright/test';

// Walks the visible note list (80 recent rows) end-to-end and verifies:
//   - each row click opens the detail pane without raising a console error
//   - .mem-markdown mounts for every note
//
// The Jest all-notes-smoke test exercises the full 793-note corpus at
// the component layer; this browser-level check proves the real app
// shell survives mounting/unmounting detail views repeatedly.

test('clicking every visible note row opens without runtime errors', async ({ page }) => {
  test.setTimeout(5 * 60 * 1000);

  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => pageErrors.push(err.message));

  await page.goto('/');
  await expect(page.getByPlaceholder('Search')).toBeVisible();

  // Empty query shows the category picker and exact directory-prefix
  // queries show the directory browser. Use a flat-search query (a
  // filename keyword, not a top-level dir name) to populate the list.
  await page.getByPlaceholder('Search').fill('hooks');
  const noteRows = page.locator('[aria-label^="Open "]:not([aria-label^="Open category"])');
  // Wait for at least one row to render (debounce + auto-drill can
  // re-render once before the list stabilises).
  await expect(noteRows.first()).toBeVisible({ timeout: 10000 });
  // Give the list one more moment to settle so count() doesn't race
  // against a pending re-render.
  await page.waitForTimeout(200);
  const rowRole = noteRows;

  const total = await rowRole.count();
  expect(total).toBeGreaterThan(1);

  const limit = Math.min(total, Number(process.env.PLAYWRIGHT_SMOKE_LIMIT ?? total));

  for (let i = 0; i < limit; i += 1) {
    const row = rowRole.nth(i);
    const label = (await row.getAttribute('aria-label')) ?? `row ${i}`;
    await row.scrollIntoViewIfNeeded();
    await row.click();
    await expect(page.locator('.mem-markdown').first()).toBeVisible({ timeout: 5000 });

    if (consoleErrors.length || pageErrors.length) {
      throw new Error(
        `runtime error after clicking ${label}\n` +
          `console: ${consoleErrors.join(' | ')}\n` +
          `page: ${pageErrors.join(' | ')}`,
      );
    }
  }
});
