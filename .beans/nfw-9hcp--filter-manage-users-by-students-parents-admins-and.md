---
# nfw-9hcp
title: Filter Manage Users by students, parents, admins, and archived
status: completed
type: feature
priority: normal
created_at: 2026-10-24T01:29:18Z
updated_at: 2026-10-24T01:42:09Z
---

On Manage Users, replace the Show archived checkbox with a toggle at the top of the page. Default view is Students. The other options are Parents, Admins, and Archived.

- Students lists active profiles whose role is student
- Parents lists active profiles whose role is parent
- Admins lists active profiles whose role is admin
- Archived lists archived profiles of any role

- [x] Add the toggle at the top of admin-users, defaulting to Students
- [x] Filter the list to the selected group
- [x] Remove the Show archived checkbox
- [x] Verify the four views in the browser

## Summary of Changes

Manage Users now has a Students / Parents / Admins / Archived toggle at the top (Students by default). The Show archived checkbox is gone. Role tabs show active profiles for that role; Archived shows archived profiles of any role. The list loads active and archived together so tab switches filter without a refetch race.
