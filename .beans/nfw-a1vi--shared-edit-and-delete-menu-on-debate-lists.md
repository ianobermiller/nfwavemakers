---
# nfw-a1vi
title: Shared edit and delete menu on debate lists
status: completed
type: feature
priority: normal
created_at: 2026-11-04T01:10:38Z
updated_at: 2026-11-04T03:47:39Z
---

Upcoming Debates needs a three-dot menu with Edit and Delete. Manage Debates should use that same menu instead of a separate Delete button.

- [x] Add one debate actions menu with Edit and Delete
- [x] Use it for admins on Upcoming Debates and on Manage Debates
- [x] Keep the undo row after delete
- [x] Verify both lists in the browser

## Summary of Changes

Both Upcoming Debates and Manage Debates use a shared `AdminDebateItem` with a three-dot Edit/Delete menu. Soft-delete shows the undo row immediately so live list updates do not leave a blank gap.
