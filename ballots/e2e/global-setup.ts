import { spawnSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

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
  if (!convexUrl) {
    throw new Error('Missing VITE_CONVEX_URL — run npx convex dev first');
  }

  const seed = spawnSync('npx', ['convex', 'run', 'e2eSeed:seed'], {
    cwd: root,
    encoding: 'utf8',
  });
  if (seed.status !== 0) {
    console.error(seed.stdout);
    console.error(seed.stderr);
    throw new Error('e2e seed failed');
  }

  const jsonStart = seed.stdout.lastIndexOf('{');
  const parsed: unknown = JSON.parse(seed.stdout.slice(jsonStart));
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !('ballotId' in parsed) ||
    !('debateId' in parsed) ||
    !('judgeEmail' in parsed) ||
    !('studentEmail' in parsed) ||
    typeof parsed.ballotId !== 'string' ||
    typeof parsed.debateId !== 'string' ||
    typeof parsed.judgeEmail !== 'string' ||
    typeof parsed.studentEmail !== 'string'
  ) {
    throw new Error('e2e seed returned invalid JSON');
  }
  const seeded = {
    ballotId: parsed.ballotId,
    debateId: parsed.debateId,
    judgeEmail: parsed.judgeEmail,
    studentEmail: parsed.studentEmail,
  };

  process.env['VITE_CONVEX_URL'] = convexUrl;
  process.env['VITE_CONVEX_SITE_URL'] = env['VITE_CONVEX_SITE_URL'] ?? '';
  process.env['E2E_JUDGE_EMAIL'] = seeded.judgeEmail;
  process.env['E2E_STUDENT_EMAIL'] = seeded.studentEmail;
  process.env['E2E_STUDENT_NAME'] = 'Alice Student';
  process.env['E2E_DEBATE_ID'] = seeded.debateId;
  process.env['E2E_BALLOT_ID'] = seeded.ballotId;
}
