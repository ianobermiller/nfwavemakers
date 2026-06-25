#!/usr/bin/env node
// Usage: npm run token <email>
// Prints a refresh token you can paste into the email field to sign in instantly.
//
// Requires INSTANT_ADMIN_TOKEN in .env.local (the admin token for your InstantDB app).
// Find it at https://instantdb.com/dash → your app → App Settings.

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));
const root = join(dir, '..');

function parseEnv(file) {
  if (!existsSync(file)) return {};
  return Object.fromEntries(
    readFileSync(file, 'utf8')
      .split('\n')
      .filter((l) => l.trim() && !l.startsWith('#'))
      .map((l) => {
        const eq = l.indexOf('=');
        return [l.slice(0, eq).trim(), l.slice(eq + 1).trim()];
      }),
  );
}

// .env.local overrides .env (same priority as Vite)
const env = { ...parseEnv(join(root, '.env')), ...parseEnv(join(root, '.env.local')) };

const appId = env['VITE_INSTANT_APP_ID'];
const adminToken = env['INSTANT_ADMIN_TOKEN'] ?? process.env['INSTANT_ADMIN_TOKEN'];

if (!appId) {
  console.error('Error: VITE_INSTANT_APP_ID not set in .env or .env.local');
  process.exit(1);
}
if (!adminToken) {
  console.error(
    'Error: INSTANT_ADMIN_TOKEN not set.\n' +
      'Add it to ballots/.env.local — find it at https://instantdb.com/dash → App Settings.',
  );
  process.exit(1);
}

const email = process.argv[2];
if (!email || !email.includes('@')) {
  console.error('Usage: npm run token <email>');
  process.exit(1);
}

const { init } = await import('@instantdb/admin');
const adminDb = init({ appId, adminToken });
const token = await adminDb.auth.createToken(email);

console.log('\nPaste this token into the email field:\n');
console.log(token);
console.log();
