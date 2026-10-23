---
# nfw-sdo0
title: Land a bean in one step
status: completed
type: task
priority: normal
created_at: 2026-10-23T21:16:01Z
updated_at: 2026-10-23T21:21:01Z
---

`npm run worktree:merge` should remove the workspace and branch after a successful land, so merge and cleanup are one command. Keep `worktree:done` for tearing down a workspace that is not being landed.

Add a project skill that runs that command when asked to merge or land a bean, without a separate "and cleanup".

- [x] Successful `worktree:merge` removes the workspace and branch
- [x] Failed verification or conflicts leave the workspace in place
- [x] `worktree:done` still abandons a workspace that is not being landed
- [x] Project skill lands a bean when asked to merge, without asking for a cleanup step
- [x] AGENTS.md and the dispatch skill describe the single land command

## Summary of Changes

`npm run worktree:merge` now removes the workspace and branch after a successful land, including when the branch is already on main. Conflicts and a failed build leave the workspace in place; `--commit-only` still commits and then cleans up. `worktree:done` remains the way to abandon a workspace that is not being landed.

The `land-bean` skill runs that one command when asked to merge or land a bean. AGENTS.md and the dispatch skill describe the same single step.
