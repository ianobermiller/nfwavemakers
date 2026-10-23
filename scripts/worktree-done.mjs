#!/usr/bin/env node
/**
 * `npm run worktree:done -- <bean-id> [--force]`: tear down a bean's workspace.
 * worktree:merge runs this after a successful land. Run it yourself only to
 * abandon a workspace you are not landing, or to retry a cleanup that failed.
 *
 * Refuses to delete an unmerged branch unless --force is passed. Run from the
 * main checkout.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const args = process.argv.slice(2);
const bean = args.find((a) => !a.startsWith("--"));
const force = args.includes("--force");

if (!bean || !/^[a-z0-9][a-z0-9-]*$/.test(bean)) {
  console.error("usage: npm run worktree:done -- <bean-id> [--force]");
  process.exit(1);
}

const worktreeDir = path.join(root, ".agents", "worktrees", bean);
const branch = `bean/${bean}`;

// Worktree removal uses --force (node_modules is untracked), so guard
// separately against discarding real work: refuse while the workspace has
// uncommitted changes, unless forced. Ignored files don't show in
// --porcelain; anything listed is real work.
if (fs.existsSync(worktreeDir)) {
  spawnSync("git", ["worktree", "prune"], { cwd: root });
  const dirty = spawnSync("git", ["status", "--porcelain"], {
    cwd: worktreeDir,
    encoding: "utf8",
  });
  const dirtyFiles = dirty.stdout.trim();
  if (dirtyFiles.length > 0 && !force) {
    console.error(`${worktreeDir} has uncommitted changes:\n\n${dirtyFiles}\n`);
    console.error("Commit them on the branch, or re-run with --force to discard.");
    process.exit(1);
  }
  const removed = spawnSync("git", ["worktree", "remove", "--force", worktreeDir], {
    cwd: root,
    stdio: "inherit",
  });
  if (removed.status !== 0) {
    console.error("Could not remove the workspace — is a dev server still running from it?");
    process.exit(removed.status ?? 1);
  }
  console.log(`Removed workspace ${worktreeDir}`);
}

const branchExists =
  spawnSync("git", ["rev-parse", "--verify", "--quiet", branch], { cwd: root }).status === 0;
if (branchExists) {
  const merged = spawnSync("git", ["branch", "--merged", "main", "--list", branch], {
    cwd: root,
    encoding: "utf8",
  });
  let isMerged = merged.stdout.trim().length > 0;
  let isSquashed = false;
  if (!isMerged) {
    // A squash merge does not record the branch as merged. If merging the
    // branch into main would change nothing, the work is already on main.
    const mainTree = spawnSync("git", ["rev-parse", "main^{tree}"], {
      cwd: root,
      encoding: "utf8",
    }).stdout.trim();
    const mergeTree = spawnSync("git", ["merge-tree", "--write-tree", "main", branch], {
      cwd: root,
      encoding: "utf8",
    });
    if (mergeTree.status === 0 && mergeTree.stdout.trim() === mainTree) {
      isMerged = true;
      isSquashed = true;
    }
  }

  if (!isMerged && !force) {
    console.error(`${branch} is not merged into main. Re-run with --force to delete it anyway.`);
    process.exit(1);
  }
  const del = spawnSync("git", ["branch", isMerged && !isSquashed ? "-d" : "-D", branch], {
    cwd: root,
    stdio: "inherit",
  });
  if (del.status !== 0) process.exit(del.status ?? 1);
}

console.log(`
Done. If the bean isn't already marked completed on main (the agent usually
does this on its branch, landing with the merge), finish it with:

  beans update ${bean} -s completed
`);
