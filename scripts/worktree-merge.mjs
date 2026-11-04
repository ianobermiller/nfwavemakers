#!/usr/bin/env node
/**
 * `npm run worktree:merge -- <bean-id> [-m "subject"] [--commit-only]`: land a
 * bean branch on main as a single squash commit — but only after the merged
 * tree builds — then remove the workspace and branch. Run from the main checkout.
 *
 *   1. rebase the workspace onto current main (skip when it already contains main)
 *   2. git merge --squash bean/<bean-id>
 *   3. npm run build
 *   4. npm run check
 *   5. only then git commit
 *   6. remove the workspace and branch (same checks as worktree:done)
 *
 * Land beans one at a time. Each rebase replays that workspace onto whatever
 * main is now, so a later bean sees earlier lands. A rebase conflict leaves
 * main untouched and the workspace mid-rebase: resolve it there, `git rebase
 * --continue`, then run this command again.
 *
 * If verification fails, or the squash stops on conflicts, the workspace stays.
 * Fix the staged tree, then finish with
 * `npm run worktree:merge -- <bean-id> --commit-only` (re-runs the same gates,
 * commits, then removes the workspace), or abandon the staged merge with
 * `git reset --hard HEAD`. `--commit-only` does not rebase; it finishes a
 * squash that is already staged.
 *
 * `worktree:done` on its own is for a workspace you are not landing.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
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

function worktreeForBranch(name) {
  const listed = git(["worktree", "list", "--porcelain"]);
  if (listed.status !== 0) return null;
  const want = `refs/heads/${name}`;
  let current = null;
  for (const line of listed.stdout.split("\n")) {
    if (line.startsWith("worktree ")) current = line.slice("worktree ".length);
    else if (line.startsWith("branch ") && line.slice("branch ".length) === want) return current;
  }
  return null;
}

// The conventional directory still exists when a rebase detaches HEAD, so
// prefer it over the branch name in `git worktree list`.
function workspaceDir() {
  const conventional = path.join(root, ".agents", "worktrees", bean);
  if (fs.existsSync(path.join(conventional, ".git"))) return conventional;
  return worktreeForBranch(branch);
}

function gitPathExists(cwd, name) {
  const result = git(["rev-parse", "--git-path", name], { cwd });
  if (result.status !== 0) return false;
  return fs.existsSync(path.resolve(cwd, result.stdout.trim()));
}

function rebaseInProgress(cwd) {
  if (["rebase-merge", "rebase-apply"].some((name) => gitPathExists(cwd, name))) return true;
  const status = git(["status"], { cwd });
  return /rebase in progress/i.test(`${status.stdout}\n${status.stderr}`);
}

function displayPath(dir) {
  const rel = path.relative(root, dir);
  return rel && !rel.startsWith("..") ? rel : dir;
}

// Replay the workspace onto current main before the squash. Later lands then
// see earlier ones. Conflicts stay in the workspace; main is not touched.
function rebaseWorkspaceOntoMain() {
  const wt = workspaceDir();
  if (!wt) {
    console.log(`No workspace for ${branch}; squashing it as it is.`);
    return;
  }
  const where = displayPath(wt);
  if (rebaseInProgress(wt)) {
    fail(
      `A rebase onto main is already in progress in ${where}. Main is unchanged.\n` +
        "Resolve any conflicts there, then:\n" +
        `  git -C ${where} rebase --continue\n` +
        `  npm run worktree:merge -- ${bean}\n` +
        `Abort the rebase with: git -C ${where} rebase --abort`,
    );
  }
  const current = git(["rev-parse", "--abbrev-ref", "HEAD"], { cwd: wt }).stdout.trim();
  if (current !== branch) {
    fail(`Workspace ${where} is on ${current}, expected ${branch}.`);
  }
  if (git(["merge-base", "--is-ancestor", "HEAD", branch]).status === 0) {
    console.log(`${branch} is already based on main.`);
    return;
  }
  const dirty = git(["status", "--porcelain"], { cwd: wt }).stdout.trim();
  if (dirty) {
    fail(
      `Workspace ${where} has uncommitted changes, so it cannot rebase onto main:\n\n${dirty}\n\n` +
        `Commit them on ${branch}, then re-run: npm run worktree:merge -- ${bean}`,
    );
  }
  console.log(`Rebasing ${branch} onto main…`);
  const rebased = git(["rebase", "main"], { cwd: wt, stdio: "inherit" });
  if (rebased.status !== 0) {
    fail(
      `\nRebase onto main stopped in ${where}. Main is unchanged.\n` +
        "Resolve the conflicts there, then:\n" +
        `  git -C ${where} rebase --continue\n` +
        `  npm run worktree:merge -- ${bean}\n` +
        `Abort the rebase with: git -C ${where} rebase --abort`,
    );
  }
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

  rebaseWorkspaceOntoMain();

  console.log(`Squash-merging ${branch}…`);
  const merged = git(["merge", "--squash", branch], { stdio: "inherit" });
  if (merged.status !== 0) {
    fail(
      "\nSquash stopped on conflicts in the main checkout.\n" +
        "Resolve them here, then finish with:\n" +
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
