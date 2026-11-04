---
# nfw-9luy
title: Rebase a workspace onto main before landing
status: completed
type: task
priority: normal
created_at: 2026-11-04T16:31:50Z
updated_at: 2026-11-04T16:37:13Z
---

Parallel agents each branch from the same main. Landing the second bean squash-merges a stale diff and conflicts in the main checkout.

`npm run worktree:merge` should rebase that workspace onto current main first, stop in the workspace if the rebase conflicts, and squash only after the rebase is clean. Land beans one at a time so each rebase sees the previous land.

- [x] Rebase the workspace onto main before the squash
- [x] Stop in the workspace on rebase conflicts without touching main
- [x] Land-bean, dispatch, and AGENTS.md describe one-at-a-time rebase-then-squash

## Summary of Changes

`npm run worktree:merge` rebases the workspace onto current main before the squash. A conflict stops in that workspace and leaves main untouched; finish the rebase and run the same command again. Disjoint edits rebase cleanly, then land as one squash commit. Land beans one at a time so each rebase sees the previous land.

The land-bean skill, the dispatch skill, and AGENTS.md describe that sequence.
