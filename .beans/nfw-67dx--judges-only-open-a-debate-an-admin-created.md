---
# nfw-67dx
title: Judges only open a debate an admin created
status: completed
type: feature
priority: normal
created_at: 2026-11-04T16:22:51Z
updated_at: 2026-11-04T16:30:44Z
---

Judges can open a blank ballot from "Judge a Round" or "New Round" and pick the speakers themselves. That saves a ballot with no debate.

A judge should only open a round an admin already set up.

- [x] Remove Judge a Round and New Round
- [x] Say so when nothing is assigned
- [x] Ignore /judge when it has no debate id
- [x] Refuse to save a ballot that has no debate
- [x] Require a debate when creating a ballot in PocketBase

## Summary of Changes

Removed Judge a Round and New Round. Judges without an assigned debate see a short note that an admin must set the round up. `/judge` with no debate id falls through to the dashboard. Saving a ballot requires a debate id, and PocketBase rejects creates without one.
