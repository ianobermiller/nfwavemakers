import { spawnSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
// @ts-expect-error -- plain script shared with the command line, no types
import { applyCollections } from '../scripts/apply-collections.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const seedResultSchema = z.object({
  ballotId: z.string(),
  debateId: z.string(),
  judgeEmail: z.string(),
  studentEmail: z.string(),
});

function parseEnv(file: string): Record<string, string> {
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

export default async function globalSetup(): Promise<void> {
  const env = { ...parseEnv(join(root, '.env')), ...parseEnv(join(root, '.env.local')) };
  // The config points this at the throwaway instance it just started.
  const pocketbaseUrl =
    process.env['POCKETBASE_TEST_URL'] ?? env['POCKETBASE_TEST_URL'] ?? env['VITE_POCKETBASE_URL'];
  if (!pocketbaseUrl) {
    throw new Error('Set POCKETBASE_TEST_URL to a PocketBase test instance');
  }

  const superuserEmail = process.env['PB_SUPERUSER_EMAIL'] ?? env['POCKETBASE_ADMIN_EMAIL'];
  const superuserPassword = process.env['PB_SUPERUSER_PASSWORD'] ?? env['POCKETBASE_ADMIN_PASSWORD'];
  if (!superuserEmail || !superuserPassword) {
    throw new Error('Set PB_SUPERUSER_EMAIL and PB_SUPERUSER_PASSWORD for the test instance');
  }

  await applyCollections({
    url: pocketbaseUrl,
    email: superuserEmail,
    password: superuserPassword,
  });

  const password = process.env['TEST_ACCOUNT_PASSWORD'] ?? 'test-password';
  const seed = spawnSync(
    'node',
    ['--env-file=.env', '--env-file=.env.local', 'scripts/seed-test-accounts.mjs'],
    {
      cwd: root,
      encoding: 'utf8',
      env: { ...process.env, TEST_ACCOUNT_PASSWORD: password },
    },
  );
  if (seed.status !== 0) {
    console.error(seed.stdout);
    console.error(seed.stderr);
    throw new Error('e2e seed failed');
  }

  const jsonStart = seed.stdout.lastIndexOf('{');
  const raw: unknown = JSON.parse(seed.stdout.slice(jsonStart));
  const parsed = seedResultSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error('e2e seed returned invalid JSON');
  }
  const seeded = parsed.data;

  process.env['VITE_POCKETBASE_URL'] = pocketbaseUrl;
  process.env['E2E_JUDGE_EMAIL'] = seeded.judgeEmail;
  process.env['E2E_STUDENT_EMAIL'] = seeded.studentEmail;
  process.env['E2E_STUDENT_NAME'] = 'Alice Student';
  process.env['E2E_DEBATE_ID'] = seeded.debateId;
  process.env['E2E_BALLOT_ID'] = seeded.ballotId;
  process.env['E2E_PASSWORD'] = password;
}
