import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: false,
  retries: 0,
  timeout: 60_000,
  use: {
    baseURL: 'http://localhost:5174',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile',
      use: { ...devices['iPhone 14'] },
    },
  ],
  webServer: {
    command: 'vite --port 5174',
    url: 'http://localhost:5174',
    reuseExistingServer: false,
    env: {
      VITE_INSTANT_APP_ID: process.env['VITE_INSTANT_APP_ID'] ?? '',
    },
  },
});
