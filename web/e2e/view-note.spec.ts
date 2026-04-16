import { test, expect } from '@playwright/test';
import { fixtures, openFixture } from './helpers';

test.describe('View Note', () => {
  test('renders markdown content (code, tables) when a note is opened', async ({ page }) => {
    await openFixture(page, fixtures.dockerCompose);
    await expect(page.getByText('DATABASE_URL=postgres://db:5432/app')).toBeVisible();
    await expect(page.getByText('pg_isready -U user')).toBeVisible();
  });

  test('detail pane shows path keywords for the note (replaces Updated stamp)', async ({ page }) => {
    await openFixture(page, fixtures.jwt);
    // The jwt fixture path is frontend/network_security_auth/jwt_...md so the
    // top_dir keyword "frontend" and at least one filename keyword must appear.
    await expect(page.getByText('frontend', { exact: true }).last()).toBeVisible();
    await expect(page.getByText('jwt', { exact: true }).last()).toBeVisible();
    // "Updated 2026-04-16"-style stamp must NOT appear anywhere
    await expect(page.getByText(/^Updated \d{4}-\d{2}-\d{2}$/)).toHaveCount(0);
  });
});
