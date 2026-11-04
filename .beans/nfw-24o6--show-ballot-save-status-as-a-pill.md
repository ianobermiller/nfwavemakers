---
# nfw-24o6
title: Show ballot save status as a pill
status: completed
type: task
priority: normal
created_at: 2026-11-04T16:11:33Z
updated_at: 2026-11-04T16:19:27Z
---

The ballot form prints "Saved" on its own line under the round meta (event, date, room) with no background, so it looks like stray text floating at the top of the page.

Put the sync status in a pill on that meta row: Saved and Saving stay compact; the error state keeps the retry action readable.

- [x] Restyle the ballot sync status as a pill aligned with the round meta
- [x] Check saved, saving, and error states in the browser

## Summary of Changes

Moved the ballot sync status onto the round meta row as a pill badge. Saved uses a green pill, Saving a slate pill, and sync errors a full-width amber pill with retry.
