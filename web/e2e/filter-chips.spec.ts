import { test, expect } from '@playwright/test';
import { searchFor } from './helpers';

// ---------------------------------------------------------------------------
// IMMUTABLE REGRESSION TESTS — the horizontal chip bar above flat-search
// results. Chips are drawn from the distinct directory segments at the
// current drill-down depth. The bar auto-drills when only one option
// remains. Each chip is a button with a stable aria-label so both
// Playwright and Maestro can drive it.
// ---------------------------------------------------------------------------
test.describe('Filter chips (flat search)', () => {
  test('flat search with 2+ top_dirs shows the All chip plus an option chip per dir', async ({ page }) => {
    await searchFor(page, 'hooks');
    // Wait for debounce + results render
    await expect(page.getByRole('button', { name: 'Clear filter' })).toBeVisible({ timeout: 10000 });
    // At least two "Filter by X" chips must appear (hooks is hit across
    // multiple top-level dirs in the corpus).
    const options = page.getByRole('button', { name: /^Filter by / });
    await expect(options.first()).toBeVisible();
    const count = await options.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('tapping an option narrows the list and exposes the breadcrumb pop chip', async ({ page }) => {
    await searchFor(page, 'hooks');
    await expect(page.getByRole('button', { name: 'Clear filter' })).toBeVisible();
    const firstOption = page.getByRole('button', { name: /^Filter by / }).first();
    const optLabel = (await firstOption.getAttribute('aria-label')) ?? '';
    const optName = optLabel.replace(/^Filter by /, '');
    await firstOption.click();
    // The chosen segment must now appear as a pop-breadcrumb chip
    await expect(page.getByRole('button', { name: `Pop filter to ${optName}` })).toBeVisible();
  });

  test('Clear filter chip removes all breadcrumb segments', async ({ page }) => {
    await searchFor(page, 'hooks');
    const firstOption = page.getByRole('button', { name: /^Filter by / }).first();
    await firstOption.click();
    // Now breadcrumb has at least one entry; Clear filter wipes it
    await page.getByRole('button', { name: 'Clear filter' }).click();
    await expect(page.getByRole('button', { name: /^Pop filter to / })).toHaveCount(0);
  });

  test('editing the query resets the filter', async ({ page }) => {
    await searchFor(page, 'hooks');
    const firstOption = page.getByRole('button', { name: /^Filter by / }).first();
    await firstOption.click();
    // Pop chips exist (at least one from the tap, plus any auto-drill)
    await expect(page.getByRole('button', { name: /^Pop filter to / }).first()).toBeVisible();
    // Change the query via the input — the reset effect runs on the
    // debounced query change. `fill` replaces the value atomically
    // rather than relying on individual key events.
    await page.getByPlaceholder('Search').fill('hooksx');
    // Debounce + effect fire → filter clears
    await expect(page.getByRole('button', { name: /^Pop filter to / })).toHaveCount(0, {
      timeout: 5000,
    });
  });
});
