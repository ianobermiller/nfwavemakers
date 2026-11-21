---
# nfw-9luy
title: Rebase a workspace onto main before landing
status: completed
type: task
priority: normal
created_at: 2026-11-04T16:31:50Z
updated_at: 2026-11-21T22:58:54Z
---

Landing must rebase and verify in the bean workspace, then allow only a fast-forward onto main. Other workspaces can land while verification runs.

- [x] Rebase and verify entirely in the workspace, then fast-forward main only
- [x] Update landing instructions and remove staged-merge recovery
- [x] Exercise successful lands, conflicts, failed checks, and concurrent main updates

## Summary of Changes

The landing script rebases onto a captured main commit, runs build and check in the workspace, checks that the workspace and main did not change, then lands the verified commit with --ff-only. It preserves branch commits. Conflicts, failed checks, and concurrent main updates keep the workspace available for retry without staging a merge on main. Removed --commit-only and the landing commit-message options.

AGENTS.md, land-bean, and dispatch describe workspace verification and fast-forward landing. The landing instructions also preserve the user's request to archive the chat after a successful requested land.

Verification: npm run build and npm run check passed. All 10 Git integration tests passed, including concurrent main updates during checks and immediately before the fast-forward. No app UI states changed.
