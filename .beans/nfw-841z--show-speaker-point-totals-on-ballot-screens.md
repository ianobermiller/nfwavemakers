---
# nfw-841z
title: Show speaker point totals on ballot screens
status: completed
type: feature
priority: normal
created_at: 2026-11-04T20:36:07Z
updated_at: 2026-11-04T20:42:05Z
---

Debaters open a submitted ballot from My Feedback. Each speaker card shows the six scores and the rank, but not the speaker-point total — the sum of those scores, out of 30. The ballot editor already adds that sum up and shows it as an unlabeled number in the card header, so a judge cannot tell it is the speaker-point total.

Show the same labeled total on both screens. Speaker points do not decide the winner; this is the total already used by auto-rank.

- [x] Show a labeled speaker-point total on the read-only debater ballot
- [x] Label the speaker-point total on the ballot editor
- [x] Cover the debater total in the student ballot e2e check

## Summary of Changes

Debaters open submitted feedback without a speaker-point total next to each seat. Each card now shows a labeled `N pts` sum (out of 30) beside the rank. The ballot editor uses the same labeled total in place of the old bare number. Student e2e asserts the seed Aff totals (26 and 19).
