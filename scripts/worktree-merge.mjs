#!/usr/bin/env node
/**
 * Rebase and verify a bean in its workspace, fast-forward main, then clean up.
 * Run from the main checkout: npm run worktree:merge -- <bean-id>
 * Conflicts and failed checks leave main untouched. Fix in the workspace,
 * commit any changes, and retry. If main advances during verification, retry
 * to rebase and verify against its new tip. Landing preserves branch commits.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const args = process.argv.slice(2);
let bean;
for (const arg of args) {
  if (!arg.startsWith("-") && !bean) bean = arg;
  else {
    console.error(`unknown argument: ${arg}`);
    process.exit(1);
  }
}

if (!bean || !/^[a-z0-9][a-z0-9-]*$/.test(bean)) {
  console.error("usage: npm run worktree:merge -- <bean-id>");
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

// Conflicts and verification stay in the workspace; main is not touched.
function rebaseWorkspaceOntoMain(wt, base) {
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
  const dirty = git(["status", "--porcelain"], { cwd: wt }).stdout.trim();
  if (dirty) {
    fail(
      `Workspace ${where} has uncommitted changes, so it cannot rebase onto main:\n\n${dirty}\n\n` +
        `Commit them on ${branch}, then re-run: npm run worktree:merge -- ${bean}`,
    );
  }
  console.log(`Rebasing ${branch} onto main…`);
  const rebased = git(["rebase", base], { cwd: wt, stdio: "inherit" });
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
if (dirty) {
  fail(`Working tree has uncommitted changes:\n${dirty}\nCommit or stash first.`);
}

// --- Bean + branch ---------------------------------------------------------
const beanCheck = spawnSync("beans", ["show", "--json", bean], {
  cwd: root,
  encoding: "utf8",
});
if (beanCheck.status !== 0) fail(`Bean ${bean} not found.`);
const branch = `bean/${bean}`;
if (git(["rev-parse", "--verify", "--quiet", branch]).status !== 0) {
  fail(`No branch ${branch}. Create it with: npm run worktree:new -- ${bean}`);
}
if (branchAlreadyLanded()) {
  console.log(`${branch} is already on main.`);
  removeWorkspace();
  process.exit(0);
}

const wt = workspaceDir();
if (!wt) fail(`No workspace for ${branch}. Restore it before landing.`);
const base = git(["rev-parse", "HEAD"]).stdout.trim();
rebaseWorkspaceOntoMain(wt, base);
const tip = git(["rev-parse", "HEAD"], { cwd: wt }).stdout.trim();

console.log("\nVerifying workspace (npm run build)…");
const build = spawnSync("npm", ["run", "build"], { cwd: wt, stdio: "inherit" });
console.log("\nVerifying workspace types and lint (npm run check)…");
const check = spawnSync("npm", ["run", "check"], { cwd: wt, stdio: "inherit" });
if (build.status !== 0 || check.status !== 0) {
  fail(`Verification failed in ${displayPath(wt)}. Main is unchanged. Fix and commit there, then retry.`);
}

if (
  git(["rev-parse", "HEAD"], { cwd: wt }).stdout.trim() !== tip ||
  git(["rev-parse", branch]).stdout.trim() !== tip ||
  git(["status", "--porcelain"], { cwd: wt }).stdout.trim()
) {
  fail("Workspace changed during verification. Commit any changes there, then retry.");
}
if (
  git(["rev-parse", "HEAD"]).stdout.trim() !== base ||
  git(["symbolic-ref", "--short", "HEAD"]).stdout.trim() !== "main" ||
  git(["status", "--porcelain", "--untracked-files=no"]).stdout.trim()
) {
  fail("Main changed during verification. Retry to rebase and verify against current main.");
}

console.log(`Fast-forwarding main to ${branch}…`);
const merged = git(["-c", "merge.autostash=false", "merge", "--ff-only", "--no-edit", tip], { stdio: "inherit" });
if (merged.status !== 0) {
  fail("Fast-forward refused. The workspace is still available; retry against current main.");
}
console.log(`\nLanded on main: ${branch}`);
removeWorkspace();
