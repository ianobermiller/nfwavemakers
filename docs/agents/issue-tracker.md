# Issue tracker: Beans

Issues for this repo live as markdown files in `.beans/` at the repo root. Use the `beans` CLI for all operations. Run `beans prime` at the start of each session for agent instructions.

The ballots app keeps a separate tracker in `ballots/.beans/`. From the repo root, `beans` uses this file's tracker. Inside `ballots/`, the CLI finds the ballots tracker. Do not mix them.

## Conventions

- **Create an issue**: `beans create "Title" -t task -d "Description..." -s todo --json`
- **List issues**: `beans list --json` (add `--ready` for unblocked work)
- **View an issue**: `beans show --json <id>`
- **Update status**: `beans update --json <id> -s in-progress`
- **Complete**: `beans update --json <id> -s completed`
- **Archive**: `beans archive` (completed/scrapped beans, when requested)

Create the bean before writing code. Commit a new bean on `main` in its own commit (bean file only) before `npm run worktree:new`, because a workspace branches from `main` and cannot see an uncommitted bean.

Use `beans help` for full options. Prefer `--json` for machine-readable output.

## When a skill says "publish to the issue tracker"

Create a bean with `beans create`.

## When a skill says "fetch the relevant ticket"

Run `beans show --json <id>`.
