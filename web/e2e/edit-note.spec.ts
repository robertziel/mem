import { test, expect } from '@playwright/test';
import { uniqueTitle, createTestNote, deleteTestNote, getTestNote } from './helpers';

test.describe('Edit Note', () => {
  let notePath: string;
  const title = uniqueTitle('PW Edit Test');

  test.beforeAll(async () => {
    notePath = await createTestNote(title, '', 'Original body content.');
  });

  test.afterAll(async () => {
    await deleteTestNote(notePath);
  });

  async function navigateToNote(page: import('@playwright/test').Page) {
    await page.goto('/');
    await expect(page.locator('.note-list-item').first()).toBeVisible({ timeout: 10000 });
    await page.locator('.search-bar').fill(title.slice(0, 25));
    await expect(page.locator('.note-list-item').first()).toBeVisible({ timeout: 10000 });
    await page.locator('.note-list-item').first().click();
    await expect(page.locator('.note-viewer')).toBeVisible({ timeout: 10000 });
  }

  test('edit button opens editor with pre-filled content', async ({ page }) => {
    await navigateToNote(page);
    await page.getByRole('button', { name: 'Edit' }).click();

    await expect(page.locator('.note-editor')).toBeVisible();
    const textarea = page.locator('.note-editor-textarea');
    await expect(textarea).toBeVisible();
    const value = await textarea.inputValue();
    expect(value).toContain('Original body content.');
  });

  test('cancel discards changes and returns to viewer', async ({ page }) => {
    await navigateToNote(page);
    await page.getByRole('button', { name: 'Edit' }).click();

    const textarea = page.locator('.note-editor-textarea');
    await textarea.fill('This should be discarded');
    await page.getByRole('button', { name: 'Cancel' }).click();

    await expect(page.locator('.note-viewer')).toBeVisible();
    await expect(page.locator('.markdown-body')).toContainText('Original body content.');
  });

  test('save persists changes', async ({ page }) => {
    await navigateToNote(page);
    await page.getByRole('button', { name: 'Edit' }).click();

    const newContent = `# ${title}\n\nTags: \n\nUpdated body content.\n`;
    await page.locator('.note-editor-textarea').fill(newContent);
    await page.getByRole('button', { name: 'Save' }).click();

    await expect(page.locator('.note-viewer')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.markdown-body')).toContainText('Updated body content.');

    // Verify via API
    const note = await getTestNote(notePath);
    expect(note.content).toContain('Updated body content.');
  });
});
