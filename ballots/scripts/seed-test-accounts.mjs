import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createAuthClient } from 'better-auth/client';
import { emailOTPClient } from 'better-auth/client/plugins';
import { ConvexHttpClient } from 'convex/browser';

import { api } from '../convex/_generated/api.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function parseEnv(path) {
  if (!existsSync(path)) return {};
  return Object.fromEntries(
    readFileSync(path, 'utf8')
      .split('\n')
      .filter((line) => line.trim() && !line.trimStart().startsWith('#'))
      .map((line) => {
        const separator = line.indexOf('=');
        return [line.slice(0, separator).trim(), line.slice(separator + 1).trim()];
      }),
  );
}

const env = { ...parseEnv(join(root, '.env')), ...parseEnv(join(root, '.env.local')) };
const convexUrl = env.VITE_CONVEX_URL;
const siteUrl = env.VITE_CONVEX_SITE_URL;
const password = process.env.TEST_ACCOUNT_PASSWORD ?? 'test-password';

if (!convexUrl || !siteUrl) {
  throw new Error('Missing local Convex URLs. Run `npm run dev` first.');
}
if (!siteUrl.includes('127.0.0.1') && !siteUrl.includes('localhost')) {
  throw new Error('Test-account seeding is only allowed against local Convex.');
}

const seed = spawnSync('npx', ['convex', 'run', 'e2eSeed:seed'], {
  cwd: root,
  encoding: 'utf8',
});
if (seed.status !== 0) {
  process.stderr.write(seed.stderr);
  throw new Error('App test-data seed failed.');
}

const jsonStart = seed.stdout.lastIndexOf('{');
const seeded = JSON.parse(seed.stdout.slice(jsonStart));
const accounts = [
  { email: seeded.studentEmail, name: 'Alice Student' },
  { email: seeded.judgeEmail, name: 'Bob Judge' },
  { email: seeded.adminEmail, name: 'Carol Admin' },
];

const auth = createAuthClient({
  baseURL: siteUrl,
  fetchOptions: {
    headers: { Origin: 'http://localhost:5173' },
  },
  plugins: [emailOTPClient()],
});
const convex = new ConvexHttpClient(convexUrl);

async function waitForOtp(email) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const otp = await convex.query(api.devAuth.getOtp, { email });
    if (otp) return otp;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for the verification code for ${email}.`);
}

async function provision({ email, name }) {
  const signIn = await auth.signIn.email({ email, password });
  if (!signIn.error) return;

  const signUp = await auth.signUp.email({ email, name, password });
  if (!signUp.error) {
    const otp = await waitForOtp(email);
    const verified = await auth.emailOtp.verifyEmail({ email, otp });
    if (verified.error) throw new Error(`${email}: ${verified.error.message}`);
    return;
  }

  const requested = await auth.emailOtp.requestPasswordReset({ email });
  if (requested.error) throw new Error(`${email}: ${requested.error.message}`);
  const otp = await waitForOtp(email);
  const reset = await auth.emailOtp.resetPassword({ email, otp, password });
  if (reset.error) throw new Error(`${email}: ${reset.error.message}`);
}

for (const account of accounts) {
  await provision(account);
}

console.log(`Seeded ${accounts.map(({ email }) => email).join(', ')}`);
console.log(`Password: ${password}`);
