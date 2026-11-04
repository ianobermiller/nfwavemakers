---
# nfw-yd72
title: Let judges open today's debate all day
status: completed
type: bug
priority: normal
created_at: 2026-11-04T00:35:33Z
updated_at: 2026-11-04T00:37:48Z
---

A debate dated today disappears after 7pm Eastern because the dashboard treats "today" as the UTC date. The assigned-debate query also uses `judges ?=`, which matches no rows, so a parent judge sees every round and a "Judge a Round" button instead of the debate they were assigned.

A judge should see the debate they are assigned to for the whole local day, and clicking that card should open its ballot. Other rounds should not be listed for them.

- [x] Keep debates dated today visible for the whole local day
- [x] Load assigned debates with a filter that matches the judges relation
- [x] Show a parent only their debate, and open that ballot from the card
- [x] Let an admin who is a judge start from their own debate card
- [x] Verify as a non-admin judge, including after UTC midnight

## Summary of Changes

Parent judges no longer see every upcoming round. The dashboard uses the local calendar day for upcoming debates, and assigned debates load with `judges.id ?=`, which actually matches the relation. Parents only get their debate cards under Your Debates, and clicking one opens that ballot. Verified as Jenny Shrode: one Auditorium card, no Class A/B list, ballot opens from the card.
