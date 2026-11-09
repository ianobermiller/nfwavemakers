---
# nfw-q1va
title: Update the tab title on ballots
status: completed
type: task
priority: normal
created_at: 2026-11-09T15:07:10Z
updated_at: 2026-11-09T15:12:32Z
---

The club pages set the browser tab title. Ballots only does that on the sign-in screen and the pending-access gate, so a signed-in ballots screen keeps the previous page's title.

Set the tab title to "Ballots — North Florida Wavemakers" for every ballots route. Leave the more specific titles on sign-in and pending access.

- [x] Set the ballots tab title from the route
- [x] Confirm club pages and the pending-access title still win
- [x] Screenshot the tab title on a ballots screen and on a club page

## Summary of Changes

Signed-in ballots screens now set `document.title` to `Ballots — North Florida Wavemakers` from `PageLayout`, and profile setup does the same. Sign-in and pending-access keep their more specific titles. Verified About ↔ Ballots navigation updates the tab title.
