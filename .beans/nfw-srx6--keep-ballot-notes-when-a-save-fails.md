---
# nfw-srx6
title: Keep ballot notes when a save fails
status: completed
type: bug
priority: high
created_at: 2026-11-04T14:52:02Z
updated_at: 2026-11-04T15:01:35Z
---

A judge's speaker notes disappeared from a live ballot. The autosave requests were rejected (the session was no longer accepted), the form never said so, and a reload kept only what the server had already stored.

Written feedback has to survive a failed save, a refresh, and a closed tab. The copy on this device is the source of truth until the server confirms it.

- [x] Save the draft on this device on every change
- [x] Restore that draft when it has notes the server does not
- [x] Retry failed saves, and never replace stored notes with an empty payload
- [x] Show when feedback is only on this device
- [x] Cover restore, retry, and the empty-notes guard with tests

## Summary of Changes

Ballot drafts now write to localStorage on every edit. On reload, a richer local draft wins over a thinner server copy, so failed autosaves cannot erase notes. Server saves retry with backoff, show Saved / Saving / error status on the form, and `preserveNotes` keeps typed feedback when a later payload would wipe it. Covered by unit tests in `ballots/lib/ballotLocalDraft.test.ts`.
