# Issue tracker: Beans

Issues for this project live as markdown files in `.beans/`. Use the `beans` CLI for all operations. Run `beans prime` at the start of each session for agent instructions.

## Conventions

- **Create an issue**: `beans create "Title" -t task -d "Description..." -s todo --json`
- **List issues**: `beans list --json` (add `--ready` for unblocked work)
- **View an issue**: `beans show --json <id>`
- **Update status**: `beans update --json <id> -s in-progress`
- **Complete**: `beans update --json <id> -s completed`
- **Archive**: `beans archive` (completed/scrapped beans, when requested)

Use `beans help` for full options. Prefer `--json` for machine-readable output.

## When a skill says "publish to the issue tracker"

Create a bean with `beans create`.

## When a skill says "fetch the relevant ticket"

Run `beans show --json <id>`.
