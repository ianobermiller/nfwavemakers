---
# nfw-wxnv
title: Update an open ballot when speaking order changes
status: todo
type: bug
priority: high
created_at: 2026-11-04T01:11:10Z
updated_at: 2026-11-04T01:11:10Z
---

Starting a ballot copies the debate's speakers onto the draft. Changing who speaks first and second on the affirmative (or negative) after that leaves the open ballot on the old order. Speakers are locked on a debate ballot, so the judge cannot fix it there.

An unsubmitted ballot should follow the debate's current speaking order. Scores, notes, and ranks already entered should stay with the speaker when their slot changes.

- [ ] Align draft speaker slots with the debate's current order
- [ ] Carry scores, notes, and ranks with the speaker
- [ ] Cover a speaking-order change with a unit test
