import { test, expect } from '@playwright/test';
import { gotoApp, searchFor } from './helpers';

test.describe('Search', () => {
  test('typing into the bar filters the list', async ({ page }) => {
    await searchFor(page, 'docker compose');
    await expect(
      page
        .getByRole('button')
        .filter({ has: page.getByText('devops/docker/docker_compose.md', { exact: true }) }),
    ).toBeVisible();
  });

  test('clearing the pill restores the unfiltered recent list', async ({ page }) => {
    await searchFor(page, 'docker compose');
    // wait for the narrow (filtered) list to settle
    await expect(
      page
        .getByRole('button')
        .filter({ has: page.getByText('devops/docker/docker_compose.md', { exact: true }) }),
    ).toBeVisible();
    const rowRole = page.getByRole('button', { name: /^Open / });
    const filteredCount = await rowRole.count();

    await page.getByPlaceholder('Search').fill('');
    // Wait until the unfiltered list grows past the filtered one
    await expect.poll(async () => rowRole.count(), { timeout: 5000 }).toBeGreaterThan(filteredCount);
  });

  test('highlights matched terms in the list rows', async ({ page }) => {
    await searchFor(page, 'ruby metaprogramming');
    // Wait for at least one filtered row to appear (debounced search)
    await expect(
      page
        .getByRole('button')
        .filter({ has: page.getByText('ruby/metaprogramming', { exact: false }) })
        .first(),
    ).toBeVisible({ timeout: 10000 });
    // highlight() wraps each matched term in its own <span>. Poll because
    // react-native-web repaints briefly as the filtered list renders.
    await expect
      .poll(
        async () =>
          page.evaluate(() =>
            Array.from(document.querySelectorAll('span'))
              .map((s) => (s.textContent ?? '').toLowerCase().trim())
              .filter(Boolean),
          ),
        { timeout: 5000 },
      )
      .toEqual(expect.arrayContaining(['ruby', 'metaprogramming']));
  });

  test('non-matching query yields zero note rows', async ({ page }) => {
    await searchFor(page, 'zzzzzzzzzzzzz no such keyword');
    // only the bottom-bar buttons remain (search / back / clean), never a note row
    const rowButtons = page.getByRole('button', { name: /Open / });
    await expect(rowButtons).toHaveCount(0);
  });

  test('the Clean button clears query, returns to list, and focuses the input (mobile)', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await searchFor(page, 'docker compose');
    const firstRow = page.getByRole('button').filter({ has: page.getByText(/docker_compose/) }).first();
    await firstRow.click();

    const cleanBtn = page.getByRole('button', { name: 'Clear search and focus' });
    await expect(cleanBtn).toBeVisible();
    await cleanBtn.click();

    await expect(page.getByPlaceholder('Search')).toBeFocused();
    await expect(page.getByPlaceholder('Search')).toHaveValue('');
  });

  test('the Back button on mobile returns from detail to list', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoApp(page);
    await page
      .getByRole('button')
      .filter({ has: page.getByText(/\.md$/) })
      .first()
      .click();
    const back = page.getByRole('button', { name: 'Back to list' });
    await expect(back).toBeVisible();
    await back.click();
    // detail markdown disappears; list is visible again
    await expect(page.locator('.mem-markdown')).toHaveCount(0);
  });
});
