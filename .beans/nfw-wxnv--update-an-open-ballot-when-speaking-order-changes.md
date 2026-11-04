---
# nfw-wxnv
title: Update an open ballot when speaking order changes
status: completed
type: bug
priority: high
created_at: 2026-11-04T01:11:10Z
updated_at: 2026-11-04T03:41:27Z
---

Starting a ballot copies the debate's speakers onto the draft. Changing who speaks first and second on the affirmative (or negative) after that leaves the open ballot on the old order. Speakers are locked on a debate ballot, so the judge cannot fix it there.

An unsubmitted ballot should follow the debate's current speaking order. Scores, notes, and ranks already entered should stay with the speaker when their slot changes.

- [x] Align draft speaker slots with the debate's current order
- [x] Persist rematched slots when the draft was out of date
- [x] Rematch live when the debate teams change while the ballot is open
- [x] Carry scores, notes, and ranks with the speaker
- [x] Cover a speaking-order change with a unit test

## Summary of Changes

Open ballot drafts now rematch to the debate's current speaking order. Scores, notes, and ranks move with each speaker; eval records stay on their position slots because `(ballot, position)` is unique. A stale draft is persisted on load, and a live debate edit rematches while the ballot is open. Covered by unit tests in `ballots/services/ballot.test.ts`.
