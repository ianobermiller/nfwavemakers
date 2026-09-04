---
# ballots-n2bc
title: Archive inactive users
status: completed
type: feature
priority: normal
created_at: 2026-09-04T15:17:24Z
updated_at: 2026-09-04T17:03:30Z
---

Problem: Students and judges who are no longer in the club should be archivable.

Acceptance:
- Admins can archive users (students and judges)
- Archived users are not selectable in pickers/dropdowns
- Archived users are hidden from lists by default
- Lists include a toggle to show archived users

## Plan

- [x] Add archived field (or equivalent) on users in schema
- [x] Admin UI to archive/unarchive students and judges
- [x] Exclude archived users from pickers/dropdowns
- [x] Hide archived users from lists by default; add a toggle to show them
- [x] Verify in the browser

## Summary of Changes

Admins can archive/unarchive members from Manage Users. Archived people are hidden unless **Show archived** is on, cannot be newly assigned in student/judge pickers, and cannot archive themselves.
