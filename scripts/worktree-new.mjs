#!/usr/bin/env node
/**
 * `npm run worktree:new -- <bean-id>`: create an isolated workspace for a bean:
 * a git worktree at .agents/worktrees/<bean-id> on branch bean/<bean-id>, with
 * dependencies installed and the bean marked in-progress inside the workspace
 * (so the main checkout stays clean). Run from the main checkout.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const bean = process.argv[2];
if (!bean || !/^[a-z0-9][a-z0-9-]*$/.test(bean)) {
  console.error("usage: npm run worktree:new -- <bean-id>  (e.g. nfw-ab12)");
  process.exit(1);
}

const beanCheck = spawnSync("beans", ["show", "--json", bean], {
  cwd: root,
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
});
if (beanCheck.status !== 0) {
  console.error(`Bean ${bean} not found — create it first with beans create.`);
  process.exit(1);
}

// The worktree branches from main's HEAD, so the bean file must be committed —
// beans created seconds ago exist only in main's working tree and would be
// invisible (and un-updatable) inside the workspace.
let beanPath;
try {
  const info = JSON.parse(beanCheck.stdout);
  beanPath = info.bean?.path ?? info.path;
} catch {
  /* fall through to the generic flow */
}
if (
  beanPath &&
  spawnSync("git", ["cat-file", "-e", `HEAD:.beans/${beanPath}`], { cwd: root }).status !== 0
) {
  console.error(
    `Bean file .beans/${beanPath} is not committed on main yet.\n` +
      "Repo convention: new beans get their own commit right away — commit it, then re-run.",
  );
  process.exit(1);
}

// Drop stale registrations before checking what's really on disk.
spawnSync("git", ["worktree", "prune"], { cwd: root });

const worktreeDir = path.join(root, ".agents", "worktrees", bean);
const branch = `bean/${bean}`;

if (fs.existsSync(worktreeDir)) {
  console.log(`Workspace already exists: ${worktreeDir}`);
  process.exit(0);
}
fs.mkdirSync(path.dirname(worktreeDir), { recursive: true });

const branchExists =
  spawnSync("git", ["rev-parse", "--verify", "--quiet", branch], { cwd: root }).status === 0;
const addArgs = branchExists
  ? ["worktree", "add", worktreeDir, branch]
  : ["worktree", "add", worktreeDir, "-b", branch, "main"];
const added = spawnSync("git", addArgs, { cwd: root, stdio: "inherit" });
if (added.status !== 0) process.exit(added.status ?? 1);

function install(label, cwd) {
  console.log(`Installing dependencies (${label})…`);
  const result = spawnSync("npm", ["ci"], { cwd, stdio: "inherit" });
  if (result.status !== 0) {
    console.error(`npm ci failed; clean up with: npm run worktree:done -- ${bean} --force`);
    process.exit(result.status ?? 1);
  }
}

install("repo root", worktreeDir);

// Mark in-progress inside the workspace: main's .beans stays untouched, and the
// agent's first commit on the branch carries the status change.
const marked = spawnSync("beans", ["update", bean, "-s", "in-progress"], {
  cwd: worktreeDir,
  stdio: "inherit",
});
if (marked.status !== 0) {
  console.error(
    `Could not mark ${bean} in-progress inside the workspace — is the bean file committed on main?`,
  );
  process.exit(marked.status ?? 1);
}

console.log(`
Ready. Work entirely inside the workspace:

  cd ${path.relative(root, worktreeDir)}

Commit with the bean id (${bean}). Verify with \`npm run build\` and
\`npm run check\`. The main checkout owns port 3000. Serve this workspace
with \`npx vite --port 0\`.
`);
