---
# ballots-82te
title: Remove leftover Convex skills and references
status: completed
type: task
priority: normal
created_at: 2026-09-06T12:07:29Z
updated_at: 2026-09-06T12:17:46Z
parent: ballots-y84i
---

Delete Convex agent skills and remaining Convex config/docs now that the app uses PocketBase.

- [x] Delete Convex skill trees and skills-lock entries
- [x] Remove Convex leftover config and current-docs references
- [x] Scrap the unused production-data import bean

## Summary of Changes

Removed Convex skill trees, emptied skills-lock, deleted leftover Convex backend/config, and stripped Convex mentions from current docs and lint/gitignore. Scrapped ballots-g606 (no production data) and ballots-w4tr (Convex prod env vars no longer apply).
