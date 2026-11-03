---
# nfw-o7el
title: Show judges on every debate card
status: completed
type: bug
priority: normal
created_at: 2026-11-03T23:51:24Z
updated_at: 2026-11-03T23:55:58Z
---

Manage Debates renders a different card than Upcoming Debates, so judges never appear there. Both lists should use the same card, and an admin should be able to open a debate for editing from Upcoming Debates.

- [ ] Show judges on the shared debate card
- [ ] Render Upcoming Debates with that card
- [ ] Let admins open the debate editor from an upcoming debate
- [x] Verify both lists in the browser

## Summary of Changes

`DebateCard` now lists judges with avatars. Upcoming Debates uses that same card; for admins, clicking a card opens the debate editor. Manage Debates already used `DebateCard`, so both lists match.
