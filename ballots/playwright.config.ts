import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: true,
  workers: 4,
  retries: 0,
  timeout: 30_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: 'http://localhost:5174/ballots/',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile',
      use: { ...devices['Pixel 7'], channel: 'chrome' },
    },
  ],
  webServer: {
    command: 'vite --port 5174',
    url: 'http://localhost:5174/ballots/',
    reuseExistingServer: false,
    // The webServer starts BEFORE globalSetup runs, so it can't pick up the
    // temporary app ID via process.env. Instead, each test injects the temp
    // app ID into the page (see test.beforeEach in ballot.spec.ts), and db.ts
    // honors a window.__INSTANT_APP_ID__ override.
  },
});
