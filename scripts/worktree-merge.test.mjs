import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const scripts = path.dirname(fileURLToPath(import.meta.url));

function fixture(t) {
  const temp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "landing-test-")));
  t.after(() => fs.rmSync(temp, { recursive: true, force: true }));
  const root = path.join(temp, "repo");
  const bin = path.join(temp, "bin");
  fs.mkdirSync(path.join(root, "scripts"), { recursive: true });
  fs.mkdirSync(bin);
  const env = {
    ...process.env,
    PATH: `${bin}${path.delimiter}${process.env.PATH}`,
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_CONFIG_GLOBAL: os.devNull,
    GIT_AUTHOR_NAME: "Landing test",
    GIT_AUTHOR_EMAIL: "landing@example.test",
    GIT_COMMITTER_NAME: "Landing test",
    GIT_COMMITTER_EMAIL: "landing@example.test",
    LANDING_TEST_ROOT: root,
    LANDING_TEST_LOG: path.join(temp, "checks.jsonl"),
  };
  function git(cwd, ...args) {
    const result = spawnSync("git", args, { cwd, env, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
  }
  function commit(cwd, name, content) {
    fs.writeFileSync(path.join(cwd, name), content);
    git(cwd, "add", name);
    git(cwd, "commit", "-m", `nfw-test: ${name}`);
  }
  for (const name of ["worktree-merge.mjs", "worktree-done.mjs"]) {
    fs.copyFileSync(path.join(scripts, name), path.join(root, "scripts", name));
  }
  const realGit = spawnSync("which", ["git"], { encoding: "utf8" }).stdout.trim();
  fs.writeFileSync(path.join(bin, "git"), `#!${process.execPath}
import fs from 'node:fs';
import { spawnSync, execFileSync } from 'node:child_process';
const realGit = ${JSON.stringify(realGit)};
const args = process.argv.slice(2);
if (process.env.LANDING_TEST_MODE === 'race' && args.includes('--ff-only')) {
  const cwd = process.env.LANDING_TEST_ROOT;
  fs.writeFileSync(cwd + '/concurrent.txt', 'last-moment landing');
  execFileSync(realGit, ['add', 'concurrent.txt'], { cwd });
  execFileSync(realGit, ['commit', '-m', 'concurrent landing'], { cwd });
}
const result = spawnSync(realGit, args, { stdio: 'inherit' });
process.exit(result.status ?? 1);
`, { mode: 0o755 });
  fs.writeFileSync(path.join(bin, "beans"), `#!${process.execPath}\nconsole.log('{}');\n`, { mode: 0o755 });
  fs.writeFileSync(path.join(bin, "npm"), `#!${process.execPath}
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
const root = process.env.LANDING_TEST_ROOT;
const command = process.argv[3];
fs.appendFileSync(process.env.LANDING_TEST_LOG, JSON.stringify({ cwd: process.cwd(), command }) + '\\n');
if (command === 'build' && process.env.LANDING_TEST_MODE === 'build-fail') process.exit(1);
if (command === 'check') {
  if (process.env.LANDING_TEST_MODE === 'fail') process.exit(1);
  if (process.env.LANDING_TEST_MODE === 'dirty') fs.writeFileSync('bean.txt', 'changed during check');
  if (process.env.LANDING_TEST_MODE === 'advance') {
    fs.writeFileSync(root + '/concurrent.txt', 'another landing');
    execFileSync('git', ['add', 'concurrent.txt'], { cwd: root });
    execFileSync('git', ['commit', '-m', 'concurrent landing'], { cwd: root });
  }
}
`, { mode: 0o755 });
  // Make extensionless stub executables ES modules on all supported Node versions.
  fs.writeFileSync(path.join(temp, "package.json"), '{"type":"module"}');
  git(root, "init", "-b", "main");
  git(root, "add", "scripts");
  commit(root, ".gitignore", ".agents/\n");
  commit(root, "shared.txt", "initial\n");
  const wt = path.join(root, ".agents", "worktrees", "nfw-test");
  git(root, "worktree", "add", wt, "-b", "bean/nfw-test");
  commit(wt, "bean.txt", "bean work\n");
  return {
    root, wt, git, commit,
    head: () => git(root, "rev-parse", "HEAD"),
    land(mode = "", ...args) {
      const result = spawnSync(process.execPath, [path.join(root, "scripts", "worktree-merge.mjs"), "nfw-test", ...args], {
        cwd: root, env: { ...env, LANDING_TEST_MODE: mode }, encoding: "utf8",
      });
      return { ...result, output: result.stdout + result.stderr };
    },
    checks: () => fs.readFileSync(env.LANDING_TEST_LOG, "utf8").trim().split("\n").map(JSON.parse),
  };
}

test("rebases stale work, verifies in workspace, and fast-forwards preserving commits", (t) => {
  const f = fixture(t);
  f.commit(f.wt, "second.txt", "second commit\n");
  f.commit(f.root, "other.txt", "earlier landing\n");
  const base = f.head();
  const result = f.land();
  assert.equal(result.status, 0, result.output);
  assert.deepEqual(f.checks(), [{ cwd: f.wt, command: "build" }, { cwd: f.wt, command: "check" }]);
  assert.equal(f.git(f.root, "rev-list", "--count", `${base}..HEAD`), "2");
  assert.equal(f.git(f.root, "rev-list", "--merges", `${base}..HEAD`), "");
  assert.equal(fs.existsSync(f.wt), false);
  assert.equal(f.git(f.root, "branch", "--list", "bean/nfw-test"), "");
  assert.equal(f.git(f.root, "status", "--porcelain"), "");
});

for (const mode of ["build-fail", "fail", "dirty"]) {
  test(`${mode} verification leaves main unchanged and workspace available`, (t) => {
    const f = fixture(t);
    const base = f.head();
    const result = f.land(mode);
    assert.notEqual(result.status, 0, result.output);
    assert.equal(f.head(), base);
    assert.equal(f.git(f.root, "status", "--porcelain"), "");
    assert.equal(fs.existsSync(f.wt), true);
  });
}

test("main advancing during checks requires a retry and re-verification", (t) => {
  const f = fixture(t);
  const result = f.land("advance");
  assert.notEqual(result.status, 0, result.output);
  assert.match(result.output, /Main changed during verification/);
  assert.equal(fs.existsSync(path.join(f.root, "bean.txt")), false);
  assert.equal(f.git(f.root, "status", "--porcelain"), "");
  assert.equal(fs.existsSync(f.wt), true);
  const retry = f.land();
  assert.equal(retry.status, 0, retry.output);
  assert.equal(f.checks().length, 4);
  assert.equal(fs.readFileSync(path.join(f.root, "concurrent.txt"), "utf8"), "another landing");
});

test("rebase conflict and retry leave main untouched", (t) => {
  const f = fixture(t);
  f.commit(f.wt, "shared.txt", "workspace version\n");
  f.commit(f.root, "shared.txt", "main version\n");
  const base = f.head();
  const conflict = f.land();
  assert.notEqual(conflict.status, 0, conflict.output);
  assert.match(conflict.output, /Rebase onto main stopped/);
  assert.equal(f.head(), base);
  const retry = f.land();
  assert.notEqual(retry.status, 0, retry.output);
  assert.match(retry.output, /rebase onto main is already in progress/);
  assert.equal(f.git(f.root, "status", "--porcelain"), "");
});

test("dirty workspace is rejected even if already based on main", (t) => {
  const f = fixture(t);
  fs.writeFileSync(path.join(f.wt, "bean.txt"), "uncommitted work");
  const base = f.head();
  const result = f.land();
  assert.notEqual(result.status, 0, result.output);
  assert.match(result.output, /uncommitted changes/);
  assert.equal(f.head(), base);
});

test("missing workspace never falls back to a merge", (t) => {
  const f = fixture(t);
  f.git(f.root, "worktree", "remove", f.wt);
  const base = f.head();
  const result = f.land();
  assert.notEqual(result.status, 0, result.output);
  assert.match(result.output, /No workspace/);
  assert.equal(f.head(), base);
});

test("legacy commit-only flag cannot bypass workspace verification", (t) => {
  const f = fixture(t);
  const base = f.head();
  const result = f.land("", "--commit-only");
  assert.notEqual(result.status, 0, result.output);
  assert.match(result.output, /unknown argument/);
  assert.equal(f.head(), base);
});

test("main advancing immediately before merge is rejected by ff-only", (t) => {
  const f = fixture(t);
  const result = f.land("race");
  assert.notEqual(result.status, 0, result.output);
  assert.match(result.output, /Fast-forward refused/);
  assert.equal(fs.existsSync(path.join(f.root, "bean.txt")), false);
  assert.equal(f.git(f.root, "status", "--porcelain"), "");
  assert.equal(fs.existsSync(f.wt), true);
  const retry = f.land();
  assert.equal(retry.status, 0, retry.output);
  assert.equal(fs.readFileSync(path.join(f.root, "concurrent.txt"), "utf8"), "last-moment landing");
});
