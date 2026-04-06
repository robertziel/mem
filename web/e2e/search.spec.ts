import { test, expect } from '@playwright/test';
import { uniqueTitle, createTestNote, deleteTestNote } from './helpers';

test.describe('Search', () => {
  let filenamePath: string;
  let contentPath: string;
  const keyword = `pwsearch${Date.now()}`;

  test.beforeAll(async () => {
    filenamePath = await createTestNote(`${keyword} filename note`);
    contentPath = await createTestNote(
      uniqueTitle('PW Content'),
      '',
      `This body contains ${keyword} inside it.`,
    );
  });

  test.afterAll(async () => {
    await deleteTestNote(filenamePath);
    await deleteTestNote(contentPath);
  });

  test('typing in search filters notes', async ({ page }) => {
    await page.goto('/');
    await page.locator('.search-bar').fill(keyword);
    // Wait for debounced search results
    await expect(page.locator('.note-list-item')).toHaveCount(2, { timeout: 5000 });
  });

  test('filename matches rank above content matches', async ({ page }) => {
    await page.goto('/');
    await page.locator('.search-bar').fill(keyword);
    await expect(page.locator('.note-list-item').first()).toBeVisible({ timeout: 5000 });
    // Filename match (score 2) should be first
    const firstPath = await page.locator('.note-list-item-path').first().textContent();
    expect(firstPath).toContain(keyword);
  });

  test('search results show preview snippets', async ({ page }) => {
    await page.goto('/');
    await page.locator('.search-bar').fill(keyword);
    await expect(page.locator('.note-list-item-preview').first()).toBeVisible({ timeout: 5000 });
  });

  test('clearing search restores full list', async ({ page }) => {
    await page.goto('/');
    // Wait for initial note list to load
    await expect(page.locator('.note-list-item').first()).toBeVisible({ timeout: 5000 });
    const initialCount = await page.locator('.note-list-item').count();

    await page.locator('.search-bar').fill(keyword);
    await expect(page.locator('.note-list-item')).toHaveCount(2, { timeout: 5000 });

    await page.locator('.search-bar').fill('');
    await expect(page.locator('.note-list-item')).toHaveCount(initialCount, { timeout: 5000 });
  });

  test('slash key focuses search bar', async ({ page }) => {
    await page.goto('/');
    // Click body to ensure search is not focused
    await page.locator('.main-content').click();
    await page.keyboard.press('/');
    await expect(page.locator('.search-bar')).toBeFocused();
  });

  test('no matches shows empty state', async ({ page }) => {
    await page.goto('/');
    await page.locator('.search-bar').fill('xyznonexistent999999');
    await expect(page.locator('.note-list-empty')).toBeVisible({ timeout: 5000 });
  });
});
