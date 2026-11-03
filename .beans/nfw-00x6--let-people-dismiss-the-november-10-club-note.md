---
# nfw-00x6
title: Let people dismiss the November 10 club note
status: completed
type: task
priority: high
created_at: 2026-11-03T23:17:24Z
updated_at: 2026-11-03T23:18:51Z
---

The November 10 cancellation note needs a close control. Closing it should stick in localStorage under a key for that date, so it stays hidden on later visits and does not collide with a notice for another day.

- [x] Add a close control on the note
- [x] Remember the dismissal in localStorage under a November 10 key
- [x] Verify closing it hides the note after a reload

## Summary of Changes

The cancellation note has a close button. Closing it writes `dismissed` to localStorage under `nfw-no-club-notice:2026-11-10`, so the note stays hidden on later visits and the key is specific to this Tuesday. The Eastern-time cutoff is unchanged.

Checked by closing the note, confirming the stored value, and reloading the schedule page, where the note stayed hidden.
