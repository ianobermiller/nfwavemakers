#!/usr/bin/env node
/**
 * `npm run worktree:merge -- <bean-id> [-m "subject"] [--commit-only]`: land a
 * bean branch on main as a single squash commit — but only after the merged
 * tree builds — then remove the workspace and branch. Run from the main checkout.
 *
 *   1. git merge --squash bean/<bean-id>
 *   2. npm run build
 *   3. npm run check
 *   4. only then git commit
 *   5. remove the workspace and branch (same checks as worktree:done)
 *
 * If verification fails, or the squash stops on conflicts, the workspace stays.
 * Fix the staged tree, then finish with
 * `npm run worktree:merge -- <bean-id> --commit-only` (re-runs the same gates,
 * commits, then removes the workspace), or abandon the staged merge with
 * `git reset --hard HEAD`. `--commit-only` is also the path after resolving
 * merge conflicts by hand.
 *
 * `worktree:done` on its own is for a workspace you are not landing.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const args = process.argv.slice(2);
let bean;
let message;
let commitOnly = false;
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === "--commit-only") commitOnly = true;
  else if (a === "-m" || a === "--message") message = args[++i];
  else if (!a.startsWith("-") && !bean) bean = a;
  else {
    console.error(`unknown argument: ${a}`);
    process.exit(1);
  }
}

if (!bean || !/^[a-z0-9][a-z0-9-]*$/.test(bean)) {
  console.error('usage: npm run worktree:merge -- <bean-id> [-m "subject"] [--commit-only]');
  process.exit(1);
}

function git(gitArgs, opts = {}) {
  return spawnSync("git", gitArgs, { cwd: root, encoding: "utf8", ...opts });
}

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

// True when landing the branch would not change main: a real merge ancestor,
// or a squash whose tree is already on HEAD. Squash commits are not ancestors.
function branchAlreadyLanded() {
  if (git(["merge-base", "--is-ancestor", branch, "HEAD"]).status === 0) return true;
  const headTree = git(["rev-parse", "HEAD^{tree}"]).stdout.trim();
  const merged = git(["merge-tree", "--write-tree", "HEAD", branch]);
  return merged.status === 0 && merged.stdout.trim() === headTree;
}

function removeWorkspace() {
  console.log("\nRemoving workspace and branch…");
  const done = spawnSync(process.execPath, [path.join(root, "scripts", "worktree-done.mjs"), bean], {
    cwd: root,
    stdio: "inherit",
  });
  if (done.status !== 0) {
    fail(
      "\nMain already has this work, but the workspace is still there.\n" +
        `Retry: npm run worktree:done -- ${bean}\n` +
        `Discard an unmerged branch or uncommitted workspace files: npm run worktree:done -- ${bean} --force`,
    );
  }
}

// --- Guard: must run from the main checkout, on main, with a clean tree ----
const gitDir = git(["rev-parse", "--git-dir"]).stdout.trim();
if (path.resolve(root, gitDir) !== path.join(root, ".git")) {
  fail("Run this from the main checkout, not from a linked workspace.");
}
const branchName = git(["rev-parse", "--abbrev-ref", "HEAD"]).stdout.trim();
if (branchName !== "main") {
  fail(`Main checkout must be on main (currently on ${branchName}).`);
}
const dirty = git(["status", "--porcelain", "--untracked-files=no"]).stdout.trim();
if (dirty && !commitOnly) {
  fail(`Working tree has uncommitted changes:\n${dirty}\nCommit or stash first.`);
}

// --- Bean + branch ---------------------------------------------------------
const beanCheck = spawnSync("beans", ["show", "--json", bean], {
  cwd: root,
  encoding: "utf8",
});
if (beanCheck.status !== 0) fail(`Bean ${bean} not found.`);
let beanTitle = bean;
try {
  beanTitle = JSON.parse(beanCheck.stdout).bean?.title ?? JSON.parse(beanCheck.stdout).title ?? bean;
} catch {
  /* fall back to the id */
}

const branch = `bean/${bean}`;
if (!commitOnly) {
  if (git(["rev-parse", "--verify", "--quiet", branch]).status !== 0) {
    fail(`No branch ${branch}. Create it with: npm run worktree:new -- ${bean}`);
  }
  if (branchAlreadyLanded()) {
    console.log(`${branch} is already on main.`);
    removeWorkspace();
    process.exit(0);
  }

  console.log(`Squash-merging ${branch}…`);
  const merged = git(["merge", "--squash", branch], { stdio: "inherit" });
  if (merged.status !== 0) {
    fail(
      "\nMerge stopped on conflicts. The workspace is unchanged. Resolve them, then finish with:\n" +
        `  npm run worktree:merge -- ${bean} --commit-only${message ? ` -m ${JSON.stringify(message)}` : ""}\n` +
        "(the same build gates run before the commit, which then removes the workspace)",
    );
  }
  const pending = git(["status", "--porcelain", "--untracked-files=no"]).stdout.trim();
  if (!pending) {
    console.log(`${branch} is already on main.`);
    removeWorkspace();
    process.exit(0);
  }
} else if (!dirty) {
  fail("--commit-only given but there are no staged/unstaged changes to commit.");
}

// --- Verify the merged tree before committing ------------------------------
console.log("\nVerifying merged tree before committing (npm run build)…");
const siteCheck = spawnSync("npm", ["run", "build"], { cwd: root, stdio: "inherit" });

console.log("\nVerifying types and lint (npm run check)…");
const check = spawnSync("npm", ["run", "check"], { cwd: root, stdio: "inherit" });

if (siteCheck.status !== 0 || check.status !== 0) {
  fail(
    "\nVerification FAILED — the merge is staged but NOT committed, and the workspace is still there.\n" +
      "Fix the tree, then finish with:\n" +
      `  npm run worktree:merge -- ${bean} --commit-only${message ? ` -m ${JSON.stringify(message)}` : ""}\n` +
      "or abandon the staged merge with:\n" +
      "  git reset --hard HEAD",
  );
}

// --- Commit ----------------------------------------------------------------
const subject = message ?? `bean ${bean}: ${beanTitle}`;
const commit = git(
  ["commit", "-m", subject, "-m", "Co-authored-by: Cursor <cursoragent@cursor.com>"],
  { stdio: "inherit" },
);
if (commit.status !== 0) process.exit(commit.status ?? 1);

console.log(`\nLanded on main: ${subject}`);
removeWorkspace();
