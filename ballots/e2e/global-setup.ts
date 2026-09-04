import { spawnSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

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
  const convexUrl = env['VITE_CONVEX_URL'];
  const siteUrl = env['VITE_CONVEX_SITE_URL'];
  if (!convexUrl) {
    throw new Error('Missing VITE_CONVEX_URL — run npx convex dev first');
  }
  if (!siteUrl) {
    throw new Error('Missing VITE_CONVEX_SITE_URL — run npx convex dev first');
  }

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

  process.env['VITE_CONVEX_URL'] = convexUrl;
  process.env['VITE_CONVEX_SITE_URL'] = siteUrl;
  process.env['E2E_JUDGE_EMAIL'] = seeded.judgeEmail;
  process.env['E2E_STUDENT_EMAIL'] = seeded.studentEmail;
  process.env['E2E_STUDENT_NAME'] = 'Alice Student';
  process.env['E2E_DEBATE_ID'] = seeded.debateId;
  process.env['E2E_BALLOT_ID'] = seeded.ballotId;
  process.env['E2E_PASSWORD'] = password;
}
