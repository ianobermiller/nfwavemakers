---
name: dispatch
description: >-
  Fan out ready beans to parallel background subagents, each working in its
  own git workspace under the repo's workspace workflow, then collect reports
  and surface questions and verification-ready changes. Before spawning,
  show the numbered pick and wait for a swap-or-continue answer. Use when
  the user says /dispatch, "dispatch agents", or asks to work multiple beans
  at once.
disable-model-invocation: true
---

# Dispatch parallel bean work

You are the orchestrator and the user's single point of contact. You never
work beans yourself in the main checkout — subagents do, one per bean, each
in its own workspace (see AGENTS.md → "Workspaces for parallel bean work").

## Step 1 — Pick the beans, then confirm

If the user named beans, use exactly those. Otherwise pick autonomously:

1. `beans list --json --ready`
2. Drop `epic` and `milestone` (containers; if a top epic matters, take its
   ready children instead).
3. Drop beans already dispatched: a worktree in `git worktree list --porcelain`
   or a branch in `git branch --list 'bean/*'` means an agent has it.
4. Take up to N beans in listed priority order — N defaults to 5, the user
   may override ("dispatch 3", "only bugs").

Show the selection as a numbered list, one bean per line (`id` — title).
Then stop and ask whether they want to swap any out, or whether to continue
with this set. Do not spawn subagents until they answer.

- **Continue** ("continue", "go", "looks good", or equivalent): proceed to
  Step 2 with this list.
- **Swap**: they name which numbers to drop and what replaces them — a bean
  id, or "next" for the next ready bean that is not already selected (same
  filters as above). Apply the swaps, show the numbered list again, and ask
  the same question. Repeat until they say to continue.

## Step 2 — Spawn subagents

Launch ALL subagents in ONE message: `subagent_type: "generalPurpose"`,
`run_in_background: true`, one per bean. Fill `{REPO_ROOT}` (the main
checkout path) and `{BEAN_ID}` into this template verbatim:

```text
You are implementing exactly one bean in nfwavemakers
(main checkout: {REPO_ROOT}). Your bean: {BEAN_ID}. Ignore all other beans.

The repo is a static club site at the root (vite, `npm run build` → `_site/`)
plus the ballots app in `ballots/` (its own package.json). Repo-level beans
live in the root `.beans/`. The ballots app also has `ballots/.beans/`; do
not create or update beans there unless this bean says to.

Hard rules — violating them breaks the user's setup:
- Your ONLY commands in the main checkout are the workspace scripts below.
  All editing, building, and testing happens inside your workspace.
- Never use port 3000. That belongs to the user's site on the main checkout.
- Do not push, and do not open a pull request.
- Facing an ambiguous product decision or a blocker the bean and code can't
  resolve? STOP and return questions — do not guess.

Setup:
1. cd {REPO_ROOT}
2. npm run worktree:new -- {BEAN_ID}
3. cd .agents/worktrees/{BEAN_ID}   ← your workspace for everything below
4. Run `beans prime`, heed it, then `beans show --json {BEAN_ID}`.

Work:
- Do what the bean asks. Keep its todo items current as you go.
- `npm run build` must pass before you finish.
- If you changed anything under `ballots/`, `npm run check` in `ballots/`
  must pass too.
- User-visible change? Serve it from this workspace on a free port
  (`npx vite --port 0` at the root, or the same inside `ballots/` for that
  app) and verify the affected pages in the browser. Stop the server when
  you are done.
- Commit with the bean id in every commit message; include the bean file.
- Done? Mark the bean completed with a `## Summary of Changes` section and
  commit that. Stopping with questions? Leave it in-progress.

Final report (all the orchestrator sees — make it complete):
STATUS: ready-for-verification | needs-answers | failed
SUMMARY: 2-4 bullets of what changed
VERIFY: routes/states the user should exercise, and the dev-server URL if
        you left one running, or "nothing user-visible"
QUESTIONS: numbered; only when STATUS is needs-answers
```

If a spawn fails because the bean file is uncommitted on main, tell the user
the fix (commit the bean file, then re-dispatch) and skip that bean.

## Step 3 — Relay, answer, verify

As each subagent completes, post a compact per-bean update:

- **ready-for-verification** → summary and what to look at.
- **needs-answers** → its questions, numbered, so the user can reply
  "bean x: 1) … 2) …". Then resume that subagent (Task `resume` with its
  agent id) carrying the answers.
- **failed** → what happened and a suggested next step.

When the user reports a verification pass (or tells you to merge a bean):
from the main checkout on `main`, land it with
`npm run worktree:merge -- {BEAN_ID}`, then clean up with
`npm run worktree:done -- {BEAN_ID}`.

Never create a merge commit (`git merge` without `--squash`) or fast-forward
multi-commit histories when landing a dispatched bean onto main. Always land
it through `worktree:merge`, which squash-merges and refuses to commit until
the build gates pass.

When the user wants changes: resume the subagent with the feedback (it should set
the bean back to in-progress, fix, re-verify, re-commit).

## Guardrails

- One bean per subagent; never two subagents on one bean.
- Don't poll background subagents — you're notified when each completes.
- Keep main clean: merges happen only after the user verifies.
