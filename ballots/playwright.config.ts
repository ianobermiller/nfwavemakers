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

const port = process.env['PLAYWRIGHT_PORT'] ?? availablePort();
const baseURL = `http://localhost:${port}/`;

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
  webServer: {
    command: `vite --port ${port}`,
    url: baseURL,
    reuseExistingServer: false,
  },
});
