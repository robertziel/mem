import { test, expect } from '@playwright/test';
import { uniqueTitle, deleteTestNote, getTestNote } from './helpers';

test.describe('Create Note', () => {
  const createdPaths: string[] = [];

  test.afterAll(async () => {
    for (const p of createdPaths) {
      await deleteTestNote(p);
    }
  });

  test('clicking "+ New" shows create form', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: '+ New' }).click();
    await expect(page.locator('.note-creator')).toBeVisible();
    await expect(page.locator('#title')).toBeFocused();
  });

  test('submit button disabled when title is empty', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: '+ New' }).click();
    await expect(page.getByRole('button', { name: 'Create Note' })).toBeDisabled();
  });

  test('cancel returns to list view', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: '+ New' }).click();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.locator('.note-creator')).not.toBeVisible();
    await expect(page.locator('.main-placeholder')).toBeVisible();
  });

  test('creates note with title only and redirects to view', async ({ page }) => {
    const title = uniqueTitle('PW Title Only');
    await page.goto('/');
    await page.getByRole('button', { name: '+ New' }).click();
    await page.locator('#title').fill(title);
    await page.getByRole('button', { name: 'Create Note' }).click();

    await expect(page.locator('.note-viewer')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.markdown-body')).toContainText(title);

    const path = await page.locator('.note-viewer-path').textContent();
    if (path) createdPaths.push(path);
  });

  test('creates note with all fields and correct content', async ({ page }) => {
    const title = uniqueTitle('PW Full Note');
    const tags = 'test,playwright';
    const body = 'This is the **body** of the note.';

    await page.goto('/');
    await page.getByRole('button', { name: '+ New' }).click();
    await page.locator('#title').fill(title);
    await page.locator('#tags').fill(tags);
    await page.locator('#body').fill(body);
    await page.getByRole('button', { name: 'Create Note' }).click();

    await expect(page.locator('.note-viewer')).toBeVisible({ timeout: 5000 });

    const path = await page.locator('.note-viewer-path').textContent();
    if (path) {
      createdPaths.push(path);
      const note = await getTestNote(path);
      expect(note.content).toContain(`# ${title}`);
      expect(note.content).toContain(`Tags: ${tags}`);
      expect(note.content).toContain(body);
    }
  });
});
