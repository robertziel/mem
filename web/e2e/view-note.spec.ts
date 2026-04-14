import { test, expect } from '@playwright/test';
import { fixtures, openFixture } from './helpers';

test.describe('View Note', () => {
  test('shows note content as rendered markdown', async ({ page }) => {
    await openFixture(page, fixtures.dockerCompose);
    await expect(page.getByText('DATABASE_URL=postgres://db:5432/app')).toBeVisible();
    await expect(page.getByText('pg_isready -U user')).toBeVisible();
  });

  test('toolbar shows path and date', async ({ page }) => {
    await openFixture(page, fixtures.jwt);
    await expect(page.getByText(fixtures.jwt.path, { exact: true }).last()).toBeVisible();
    await expect(page.getByText(/Updated \d{4}-\d{2}-\d{2}/)).toBeVisible();
  });
});
