---
# nfw-oa6l
title: Merge the Edit and Set Partner modals
status: completed
type: task
priority: normal
created_at: 2026-11-07T16:59:40Z
updated_at: 2026-11-07T17:06:42Z
---

The Manage Users row menu opens two dialogs for the same person: Edit (name, role, category) and Set partner. Put the debate partner on the Edit dialog and drop the separate menu item.

- [x] Show the debate partner picker on Edit for an approved student
- [x] Save the partner with the rest of the profile, and clear it when the role is no longer student
- [x] Remove the Set partner menu item
- [x] Verify the student edit dialog, the partner picker, and a non-student edit dialog

## Summary of Changes

Edit user now includes the debate partner picker for approved students. Saving updates name, role, category, and partner together, and clears the partner when the role leaves student. The separate Set partner dialog and menu item are gone.
