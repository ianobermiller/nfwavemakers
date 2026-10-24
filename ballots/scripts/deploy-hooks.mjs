import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const hooksDir = join(root, 'pocketbase/pb_hooks');
const host = process.env.POCKETBASE_SSH_HOST ?? 'opc@129.213.88.91';
const identity = process.env.POCKETBASE_SSH_IDENTITY ?? `${process.env.HOME}/.ssh/oracle-pocketbase`;
const remoteDir = process.env.POCKETBASE_REMOTE_DIR ?? '/opt/pocketbase';

const hooks = readdirSync(hooksDir).filter((name) => name.endsWith('.pb.js'));
if (hooks.length === 0) {
  console.error(`No .pb.js hooks in ${hooksDir}`);
  process.exit(1);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: 'inherit', ...options });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const ssh = ['-i', identity, host];

console.log(`Deploying ${hooks.length} hook(s) to ${host}:${remoteDir}/pb_hooks`);
run('ssh', [...ssh, `sudo mkdir -p ${remoteDir}/pb_hooks && sudo chown pocketbase:pocketbase ${remoteDir}/pb_hooks`]);

for (const hook of hooks) {
  const local = join(hooksDir, hook);
  const remoteTmp = `/tmp/${hook}`;
  run('scp', ['-i', identity, local, `${host}:${remoteTmp}`]);
  run('ssh', [
    ...ssh,
    `sudo mv ${remoteTmp} ${remoteDir}/pb_hooks/${hook} && sudo chown pocketbase:pocketbase ${remoteDir}/pb_hooks/${hook}`,
  ]);
}

run('ssh', [...ssh, 'sudo systemctl restart pocketbase']);
console.log('Hooks deployed and PocketBase restarted.');
