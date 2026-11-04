---
# nfw-9luy
title: Rebase a workspace onto main before landing
status: todo
type: task
created_at: 2026-11-04T16:31:50Z
updated_at: 2026-11-04T16:31:50Z
---

Parallel agents each branch from the same main. Landing the second bean squash-merges a stale diff and conflicts in the main checkout.

`npm run worktree:merge` should rebase that workspace onto current main first, stop in the workspace if the rebase conflicts, and squash only after the rebase is clean. Land beans one at a time so each rebase sees the previous land.

- [ ] Rebase the workspace onto main before the squash
- [ ] Stop in the workspace on rebase conflicts without touching main
- [ ] Land-bean, dispatch, and AGENTS.md describe one-at-a-time rebase-then-squash
