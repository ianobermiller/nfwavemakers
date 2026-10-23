# nfwavemakers agent instructions

**IMPORTANT**: Before you do anything else, run `beans prime` and heed its output.

## Project

nfwavemakers is the club site (static HTML at the repo root, built by `npm run build` into `_site/`) plus the ballots app in `ballots/`.

## Work tracking

- **Always use beans instead of TodoWrite** for task tracking in this repo.
- Before starting work, check for an existing bean (`beans list --json --ready`, then `beans show --json <id>`). If none covers the task, create one with `beans create` before writing code.
- Mark beans `in-progress` while working; `completed` when done with a `## Summary of Changes` section.
- Include bean IDs in commit messages.
- When asked to add a bean, commit it right away in its own commit containing only the new bean file. A workspace branches from `main`, so an uncommitted bean is invisible there.
- One bean per workspace; respect `--blocked-by` dependencies.
- The ballots app has its own tracker at `ballots/.beans/`. From the repo root, `beans` uses this repo's tracker. Inside `ballots/`, the CLI uses the ballots tracker. Keep them separate.

## Workspaces for parallel bean work

The main checkout stays on `main`. Agents never edit, build, or commit in the main checkout — the only commands an agent runs there are the workspace scripts. Each bean gets a git worktree so several can run at once.

- **Start**: `npm run worktree:new -- <bean-id>` creates `.agents/worktrees/<bean-id>` on branch `bean/<bean-id>`, installs dependencies, and marks the bean in-progress inside the workspace.
- **Work** entirely inside that directory. Commits include the bean file and the bean id.
- **Verify**: `npm run build` in the workspace. If the change touches `ballots/`, also run `npm run check` there. The main checkout owns port 3000; a workspace dev server must use another port (`npx vite --port 0`).
- **Merge**: when landing a bean on `main`, always use `npm run worktree:merge -- <bean-id>` from the main checkout — never raw `git merge --squash` / `git commit`. It creates one squash commit and refuses to commit until `npm run build` passes (and `npm run check` in `ballots/` when that app changed). If verification fails, fix the staged tree and finish with `npm run worktree:merge -- <bean-id> --commit-only`; `git reset --hard HEAD` abandons.
- **Cleanup** after merging: `npm run worktree:done -- <bean-id>` removes the workspace and branch.
- **Fan out**: the `/dispatch` skill (`.cursor/skills/dispatch`) picks ready beans, shows the numbered selection, and waits for a swap-or-continue answer before running this workflow with one background subagent per bean.

## Agent skills

### Issue tracker

Issues live in Beans (markdown in `.beans/`). See `docs/agents/issue-tracker.md`.

### Triage labels

Using default label vocabulary (needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context repo — one CONTEXT.md + docs/adr/ at the repo root. See `docs/agents/domain.md`.

## React useMemo rules
- Do NOT wrap simple boolean, string, or primitive derivations in useMemo. Compute them inline.
- Do NOT use useMemo when the result is a new object/array/Set built from constant values - referential stability is lost on every dep change anyway.
- Only use useMemo when the computation is genuinely expensive AND you have confirmed downstream re-render cost via React DevTools profiling.

## CSS and form element rules
- Do NOT add global CSS selectors for `input`, `select`, or `textarea`. Use the `<Input>`, `<Select>`, and `<Textarea>` wrapper components instead.
- Use CSS `field-sizing: content` for auto-resizing textareas. Do NOT use JS hooks that measure scrollHeight imperatively.

## Accessible overlays and pickers
- Use `@radix-ui/react-dialog` for modals/dialogs. Do NOT hand-roll focus-trap or Escape-key logic.
- Use `@radix-ui/react-popover` for floating pickers (e.g., multi-select). Do NOT hand-roll keyboard navigation for picker lists.

## Routing
- Use Wouter with `useHashLocation` for client-side routing. Do NOT use Chicane (no hash routing support).
- Define a `Route` union type and wrap Wouter's `useLocation` in a typed hook to enforce route name correctness at compile time.
