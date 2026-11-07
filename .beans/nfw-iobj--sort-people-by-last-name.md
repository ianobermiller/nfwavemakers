---
# nfw-iobj
title: Sort people by last name
status: completed
type: task
priority: normal
created_at: 2026-11-07T16:54:29Z
updated_at: 2026-11-07T17:01:35Z
---

People lists follow the full name string, so they read as first-name order. Sort every people list by last name, then full name, A–Z.

- [x] Sort the user directory by last name
- [x] Sort student and judge pickers, Manage Users, and ballots-by-student
- [x] Sort judge name lists on debate cards and the student dashboard
- [x] Keep debate speaker seats in position order
- [x] Verify the admin lists in the browser

## Summary of Changes

People lists now sort by last name, then full name. \`listUsers\` re-sorts after the PocketBase full-name query. Student and judge pickers, Manage Users, ballots-by-student, debate-card judge labels, and the student dashboard judge list all follow that order. Debate speaker seats stay in position order.
