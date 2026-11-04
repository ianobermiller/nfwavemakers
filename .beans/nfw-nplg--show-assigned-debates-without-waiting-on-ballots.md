---
# nfw-nplg
title: Show assigned debates without waiting on ballots
status: todo
type: bug
created_at: 2026-11-04T04:03:34Z
updated_at: 2026-11-04T04:03:34Z
---

The dashboard hides Your Debates until submitted ballots finish loading, then each card fetches its debate again. Assigned debates are already a single list request. Show that section as soon as the list returns, using the debates from that response.

- [ ] Render Your Debates from useAssignedDebates without waiting on submitted ballots
- [ ] Paint those cards from the list payload instead of a second fetch per card
- [ ] Keep Judge a Round for judges who have no assigned debates
