---
# nfw-xyeg
title: Manage lessons on the lessons page
status: completed
type: feature
priority: normal
created_at: 2026-11-04T03:58:39Z
updated_at: 2026-11-04T04:02:39Z
---

Admins leave the lessons page for a separate Manage Lessons screen. When the signed-in user is an admin, new, edit, and delete belong on the lessons page itself.

- [ ] Show new, edit, and delete on the lessons index for admins
- [ ] Create and edit lessons from the lessons routes
- [x] Hide management from non-admins and send the admin dashboard to lessons
- [x] Verify the admin and member views in the browser

## Summary of Changes

Admins create, edit, and delete lessons on `/lessons` (`/lessons/new`, `/lessons/edit/:id`) instead of a separate Manage Lessons screen. The admin dashboard and old `/admin-lessons` URLs go to the lessons page. Non-admins do not see management controls.
