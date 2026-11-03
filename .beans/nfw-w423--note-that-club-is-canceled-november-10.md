---
# nfw-w423
title: Note that club is canceled November 10
status: completed
type: task
priority: high
created_at: 2026-11-03T23:01:39Z
updated_at: 2026-11-03T23:05:58Z
---

Show a prominent note that there is no club next week because of the online speech tournament (Tuesday, November 10, 2026). The note must disappear on its own after that Tuesday, with no further deploy.

- [x] Show the note on every page through Tuesday, November 10 (Eastern)
- [x] Hide it automatically starting Wednesday, November 11
- [x] Verify the note in the browser

## Summary of Changes

A yellow announcement under the site header says there is no club next week because Tuesday, November 10 is the online speech tournament. On that Tuesday the headline switches to "No club today." The note compares the calendar date in America/New_York and stops rendering at midnight Eastern on Wednesday, November 11, so it leaves without another deploy.

Checked on the homepage and schedule at desktop width, and on the homepage at a phone width. Unit tests cover the Eastern-time cutoff.
