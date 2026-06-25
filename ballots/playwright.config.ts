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
    // No VITE_INSTANT_APP_ID here — globalSetup sets process.env before
    // the webServer starts, so the child process inherits the correct value.
    // Including it here would capture an empty string at config-parse time
    // and override the value globalSetup wrote.
  },
});
