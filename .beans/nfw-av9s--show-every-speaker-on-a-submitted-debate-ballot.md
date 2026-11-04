---
# nfw-av9s
title: Show every speaker on a submitted debate ballot
status: completed
type: bug
priority: high
created_at: 2026-11-04T15:16:30Z
updated_at: 2026-11-04T15:23:06Z
---

A debater opening a submitted ballot only receives the speaker evaluation where they are the speaker. PocketBase list and view rules on ballots_speaker_evals allow the judge, or that one speaker, so teammates' names, points, and notes never load.

Isla (isla@obermillers.com) on debate 26ghohn1p1dvu9g sees only her Neg 2nd card. The submitted ballot also stores full scores and notes for the other three speakers.

- [ ] Let a debater on a submitted ballot read every speaker evaluation on it
- [ ] Keep unsubmitted evaluations visible only to the judge who is writing them
- [x] Confirm a student account sees the other speakers' names, points, and notes

## Summary of Changes

Debaters on a submitted ballot can now read every seat's name, points, and notes. PocketBase list/view rules on `ballots_speaker_evals` grant team members access once `submitted_at` is set; drafts stay limited to the writing judge. Applied the rule to production, verified Isla on debate `26ghohn1p1dvu9g`, and extended the e2e seed/test so a student sees both Aff seats.
