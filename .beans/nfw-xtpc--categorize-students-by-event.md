---
# nfw-xtpc
title: Categorize students by event
status: completed
type: feature
priority: normal
created_at: 2026-11-04T15:18:18Z
updated_at: 2026-11-04T15:28:14Z
---

Students pick Speech-only, Team Policy, or Lincoln-Douglas when they finish signup. Manage Users shows that category. An admin can change it while approving a student and again later. Debate setup searches only list students whose category matches the debate. Speech-only students stay out of those searches.

## Tasks
- [x] Store a student category on the profile
- [x] Ask for the category when a student finishes signup
- [x] Show it on Manage Users and let an admin set it on approval and later
- [x] Filter debate-setup student search by the debate event
- [x] Verify signup, admin, and debate search in the browser

## Summary of Changes

Added a `category` field on `ballots_profiles` (`speech` | `tp` | `ld`). Students pick it during profile setup. Manage Users shows the label. Approval confirms the role (student or parent) and, for students, the category. Set category stays available later. Debate setup student searches only list students whose category matches the selected event; Speech-only students stay out. Existing students without a category are backfilled to Team Policy when the schema is applied.
