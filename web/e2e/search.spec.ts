import { test, expect } from '@playwright/test';
import {
  fixtures,
  gotoApp,
  mutateIndexedDbNoteTitle,
  overwriteIndexedDbServerRunId,
  readIndexedDbSnapshot,
  readRemoteSeedMeta,
  searchFor,
} from './helpers';

test.describe('Search', () => {
  test('first load imports the local snapshot into IndexedDB', async ({ page }) => {
    await gotoApp(page);
    const remoteMeta = await readRemoteSeedMeta(page);
    const dbSnapshot = await readIndexedDbSnapshot(page);

    expect(dbSnapshot.noteCount).toBeGreaterThan(0);
    expect(dbSnapshot.meta?.server_run_id).toBe(remoteMeta?.server_run_id);
    expect(dbSnapshot.meta?.note_count).toBe(remoteMeta?.note_count);
  });

  test('typing in search filters seeded notes', async ({ page }) => {
    await searchFor(page, fixtures.jwt.query);
    await expect(
      page.getByRole('button').filter({ hasText: fixtures.jwt.path }).first(),
    ).toBeVisible();
  });

  test('hierarchical ranking prefers top directory, subdirectory, then filename matches', async ({
    page,
  }) => {
    await searchFor(page, fixtures.useEffect.query);
    const firstResult = page.getByRole('button').first();
    await expect(firstResult).toContainText(fixtures.useEffect.path);
  });

  test('search results show preview snippets from local content', async ({ page }) => {
    await searchFor(page, fixtures.dockerCompose.query);
    await expect(
      page.getByRole('button').filter({ hasText: fixtures.dockerCompose.preview }).first(),
    ).toBeVisible();
  });

  test('clearing search restores full list', async ({ page }) => {
    await gotoApp(page);
    await expect(page.getByText('Showing the latest notes from the local snapshot')).toBeVisible();
    await page.getByLabel('Search notes').fill(fixtures.jwt.query);
    await expect(page.getByText(`Showing ranked matches for “${fixtures.jwt.query}”`)).toBeVisible();
    await page.getByLabel('Search notes').fill('');
    await expect(page.getByText('Showing the latest notes from the local snapshot')).toBeVisible();
  });

  test('page reload in the same server run reuses IndexedDB without reimporting', async ({ page }) => {
    const mutatedTitle = 'JWT Persisted Local Mutation';

    await gotoApp(page);
    const initialSnapshot = await readIndexedDbSnapshot(page);
    await mutateIndexedDbNoteTitle(page, fixtures.jwt.path, mutatedTitle);

    await page.reload();
    await expect(page.getByText('Search the local database')).toBeVisible();

    const afterReloadSnapshot = await readIndexedDbSnapshot(page);
    expect(afterReloadSnapshot.meta?.server_run_id).toBe(initialSnapshot.meta?.server_run_id);

    await page.getByLabel('Search notes').fill(fixtures.jwt.query);
    await expect(page.getByRole('button').filter({ hasText: mutatedTitle }).first()).toBeVisible();
  });

  test('changing the stored server run marker forces a fresh reimport from seed assets', async ({
    page,
  }) => {
    const mutatedTitle = 'JWT Mutated Before Reseed';

    await gotoApp(page);
    const remoteMeta = await readRemoteSeedMeta(page);
    await mutateIndexedDbNoteTitle(page, fixtures.jwt.path, mutatedTitle);
    await overwriteIndexedDbServerRunId(page, 'stale-local-run-id');

    await page.reload();
    await expect(page.getByText('Search the local database')).toBeVisible();
    await page.getByLabel('Search notes').fill(fixtures.jwt.query);

    const dbSnapshot = await readIndexedDbSnapshot(page);
    expect(dbSnapshot.meta?.server_run_id).toBe(remoteMeta?.server_run_id);
    await expect(page.getByRole('button').filter({ hasText: fixtures.jwt.title }).first()).toBeVisible();
    await expect(page.getByRole('button').filter({ hasText: mutatedTitle })).toHaveCount(0);
  });

  test('the app does not depend on note API routes', async ({ page }) => {
    let apiRequestCount = 0;

    await page.route('**/api/**', async (route) => {
      apiRequestCount += 1;
      await route.abort();
    });

    await searchFor(page, fixtures.dockerCompose.query);
    await expect(
      page.getByRole('button').filter({ hasText: fixtures.dockerCompose.path }).first(),
    ).toBeVisible();
    expect(apiRequestCount).toBe(0);
  });

  test('no matches shows empty state', async ({ page }) => {
    await searchFor(page, 'xyznonexistent999999');
    await expect(page.getByText('No matches found')).toBeVisible();
  });
});
