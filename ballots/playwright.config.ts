import { execFileSync } from 'node:child_process';
import { defineConfig, devices } from '@playwright/test';

// Ask the OS for an unused port so a dev server left running elsewhere, here or
// in another project, cannot collide with the test server.
function availablePort(): string {
  return execFileSync('node', [
    '-e',
    "const s=require('net').createServer();s.listen(0,'127.0.0.1',()=>{console.log(s.address().port);s.close()})",
  ])
    .toString()
    .trim();
}

// Cached in the environment because workers re-evaluate this file and must
// agree with the servers the runner already started.
const port = (process.env['PLAYWRIGHT_PORT'] ??= availablePort());
const baseURL = `http://localhost:${port}/`;

// Tests run against a throwaway PocketBase, never the production instance.
const pocketbasePort = (process.env['POCKETBASE_TEST_PORT'] ??= availablePort());
const pocketbaseURL = `http://127.0.0.1:${pocketbasePort}`;
const superuser = {
  PB_SUPERUSER_EMAIL: process.env['PB_SUPERUSER_EMAIL'] ?? 'admin@ballots.test',
  PB_SUPERUSER_PASSWORD: process.env['PB_SUPERUSER_PASSWORD'] ?? 'ballots-local-test',
};

// Global setup reads these from the environment it shares with this file.
process.env['POCKETBASE_TEST_URL'] = pocketbaseURL;
Object.assign(process.env, superuser);

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: true,
  workers: 4,
  retries: 0,
  timeout: 30_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL,
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
  webServer: [
    {
      command: `node scripts/local-pocketbase.mjs --port ${pocketbasePort}`,
      env: { ...superuser },
      url: `${pocketbaseURL}/api/health`,
      reuseExistingServer: false,
    },
    {
      command: `vite --port ${port}`,
      env: { VITE_POCKETBASE_URL: pocketbaseURL },
      url: baseURL,
      reuseExistingServer: false,
    },
  ],
});
