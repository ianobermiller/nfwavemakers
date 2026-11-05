---
# nfw-1h87
title: Prototype roomier layouts for a submitted ballot
status: completed
type: task
priority: normal
created_at: 2026-11-04T20:16:59Z
updated_at: 2026-11-05T14:38:22Z
---

Keep the two-column debater ballot. Make each speaker's name and rank easier to see, drop the extra card around the notes, show the speaker-point total, and mark the signed-in debater's seat.

- [x] Rebase onto the speaker-point totals already on main
- [x] Make the speaker name and rank prominent
- [x] Render notes as text instead of a card inside the seat card
- [x] Subtly highlight the signed-in debater's seat

## Summary of Changes

The debater ballot stays two columns. Each seat now leads with the speaker's name and a larger rank, shows the labeled point total from main, and prints the notes under the scores without a second card or a rule between the scores and the notes. The signed-in debater's seat has a light blue wash so they can find their own feedback.
