---
# nfw-gu46
title: Delay the navigation bar until a switch is slow
status: todo
type: bug
created_at: 2026-11-07T12:11:46Z
updated_at: 2026-11-07T12:11:46Z
---

The white bar at the top of the screen appears on every Lessons and Ballots switch, including ones that finish immediately. Hold that indicator for 800ms so it only shows when the transition is still pending.

- [ ] Delay the pending bar on the indicator itself by 800ms
- [ ] Keep a fast switch from flashing the bar
- [ ] Show the bar when a switch is still pending after 800ms
