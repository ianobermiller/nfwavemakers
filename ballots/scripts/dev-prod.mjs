#!/usr/bin/env node

import { spawn, spawnSync } from 'node:child_process';

function convexCloudUrl() {
  if (process.env.VITE_CONVEX_PROD_URL) {
    return process.env.VITE_CONVEX_PROD_URL.trim();
  }

  const result = spawnSync('npx', ['convex', 'env', 'get', 'CONVEX_CLOUD_URL', '--prod'], {
    encoding: 'utf8',
    timeout: 20_000,
  });
  const url = result.stdout?.trim();
  if (result.status === 0 && url?.startsWith('https://')) {
    return url;
  }

  console.error('Could not find the production Convex URL.');
  console.error(
    'Set VITE_CONVEX_PROD_URL in .env.local to the production .convex.cloud URL from the dashboard.',
  );
  if (result.stderr) {
    console.error(result.stderr.trim());
  }
  process.exit(1);
  return '';
}

const url = convexCloudUrl();
if (url.includes('127.0.0.1') || url.includes('localhost')) {
  console.error('Refusing to start: that URL is a local Convex backend, not production.');
  process.exit(1);
}

console.log(`Local UI → production Convex (${url})`);
console.log('Writes hit live club data. Ctrl+C when done, then use npm run dev for local data.');

const vite = spawn('npx', ['vite'], {
  env: { ...process.env, VITE_CONVEX_URL: url },
  stdio: 'inherit',
});

vite.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
