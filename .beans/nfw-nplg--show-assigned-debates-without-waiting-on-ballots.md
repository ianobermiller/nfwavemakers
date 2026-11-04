---
# nfw-nplg
title: Show assigned debates without waiting on ballots
status: completed
type: bug
priority: normal
created_at: 2026-11-04T04:03:34Z
updated_at: 2026-11-04T04:07:36Z
---

The dashboard hides Your Debates until submitted ballots finish loading, then each card fetches its debate again. Assigned debates are already a single list request. Show that section as soon as the list returns, using the debates from that response.

- [x] Render Your Debates from useAssignedDebates without waiting on submitted ballots
- [x] Paint those cards from the list payload instead of a second fetch per card
- [x] Keep Judge a Round for judges who have no assigned debates

## Summary of Changes

ParentDashboard shows Your Debates as soon as the assigned-debates list returns, without waiting on submitted ballots. DebateCard accepts a debate (and optional winner) so list screens paint from data they already have and skip the per-card refetch. Verified on the admin dashboard: assigned debates, upcoming debates, and submitted ballots start in parallel, and the Your Debates card arrives fully populated with no follow-up debate getOne.
