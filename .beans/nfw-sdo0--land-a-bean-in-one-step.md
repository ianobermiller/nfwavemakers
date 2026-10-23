---
# nfw-sdo0
title: Land a bean in one step
status: todo
type: task
created_at: 2026-10-23T21:16:01Z
updated_at: 2026-10-23T21:16:01Z
---

`npm run worktree:merge` should remove the workspace and branch after a successful land, so merge and cleanup are one command. Keep `worktree:done` for tearing down a workspace that is not being landed.

Add a project skill that runs that command when asked to merge or land a bean, without a separate "and cleanup".

- [ ] Successful `worktree:merge` removes the workspace and branch
- [ ] Failed verification or conflicts leave the workspace in place
- [ ] `worktree:done` still abandons a workspace that is not being landed
- [ ] Project skill lands a bean when asked to merge, without asking for a cleanup step
- [ ] AGENTS.md and the dispatch skill describe the single land command
