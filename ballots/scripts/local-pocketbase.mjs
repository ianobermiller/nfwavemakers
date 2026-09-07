import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Serves a throwaway PocketBase for the e2e suite so tests never touch the
// production instance. Uses the custom binary from the obermillers repo, which
// is the one that serves the /api/passkey routes.
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const sourceDir = resolve(root, '../../obermillers/pocketbase');
const dataDir = join(root, '.pb-test/pb_data');

const port = process.argv.includes('--port')
  ? process.argv[process.argv.indexOf('--port') + 1]
  : (process.env.POCKETBASE_TEST_PORT ?? '8090');
const email = process.env.PB_SUPERUSER_EMAIL ?? 'admin@ballots.test';
const password = process.env.PB_SUPERUSER_PASSWORD ?? 'ballots-local-test';

function binaryPath() {
  if (process.env.POCKETBASE_BIN) return process.env.POCKETBASE_BIN;

  const built = join(sourceDir, 'pocketbase');
  if (existsSync(built)) return built;

  if (!existsSync(sourceDir)) {
    throw new Error(
      `No PocketBase binary. Set POCKETBASE_BIN, or clone obermillers.com next to this repo so ${sourceDir} exists.`,
    );
  }

  const build = spawnSync('make', ['build'], { cwd: sourceDir, stdio: 'inherit' });
  if (build.status !== 0) throw new Error(`Building PocketBase in ${sourceDir} failed`);
  return built;
}

const binary = binaryPath();
mkdirSync(dataDir, { recursive: true });

const superuser = spawnSync(binary, ['superuser', 'upsert', email, password, `--dir=${dataDir}`], {
  encoding: 'utf8',
});
if (superuser.status !== 0) {
  throw new Error(`Could not create the local superuser: ${superuser.stderr || superuser.stdout}`);
}

const server = spawn(binary, ['serve', `--http=127.0.0.1:${port}`, `--dir=${dataDir}`], {
  stdio: 'inherit',
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.kill(signal));
}
server.on('exit', (code) => process.exit(code ?? 0));
