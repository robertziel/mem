import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  // Run tests in every file concurrently and use one worker per CPU.
  fullyParallel: true,
  workers: process.env.CI ? '100%' : '100%',
  retries: 1,
  reporter: [['html', { outputFolder: './playwright-report' }], ['list']],
  outputDir: './test-results',
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3030',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
