---
# nfw-gu46
title: Delay the navigation bar until a switch is slow
status: completed
type: bug
priority: normal
created_at: 2026-11-07T12:11:46Z
updated_at: 2026-11-07T12:19:34Z
---

The white bar at the top of the screen appears on every Lessons and Ballots switch, including ones that finish immediately. Hold that indicator for 800ms so it only shows when the transition is still pending.

- [x] Delay the pending bar on the indicator itself by 800ms
- [x] Keep a fast switch from flashing the bar
- [x] Show the bar when a switch is still pending after 800ms

## Summary of Changes

The top navigation pending bar now waits 800ms before becoming visible. Fast Lessons/Ballots switches finish inside that window and never flash the bar; a switch that is still pending after 800ms shows it as before.
