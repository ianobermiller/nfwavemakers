---
# nfw-0c71
title: Show speaker ranks on the debater ballot view
status: completed
type: bug
priority: high
created_at: 2026-11-04T18:41:04Z
updated_at: 2026-11-04T18:45:34Z
---

Debaters open a submitted ballot from My Feedback, which lands on the debate ballot view. That screen shows each speaker's name, scores, and notes, but it never shows the judge's speaker rank. Judges and admins already see ranks on their ballot screens. The rank is stored on each speaker evaluation and already comes back with the debate detail.

- [x] Show each speaker's rank on the debater ballot view
- [x] Cover it in the student ballot e2e check

## Summary of Changes

Debaters open submitted feedback on the debate ballot view. That screen already showed names, scores, and notes, but never the judge's speaker rank. Each seat now shows `Ranked #N` the same way the judge and admin ballot screens do. The student e2e check asserts both Aff ranks from the seed ballot.
