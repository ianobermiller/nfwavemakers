---
# nfw-yd72
title: Let judges open today's debate all day
status: todo
type: bug
created_at: 2026-11-04T00:35:33Z
updated_at: 2026-11-04T00:35:33Z
---

A debate dated today disappears after 7pm Eastern because the dashboard treats "today" as the UTC date. The assigned-debate query also uses `judges ?=`, which matches no rows, so a parent judge sees every round and a "Judge a Round" button instead of the debate they were assigned.

A judge should see the debate they are assigned to for the whole local day, and clicking that card should open its ballot. Other rounds should not be listed for them.

- [ ] Keep debates dated today visible for the whole local day
- [ ] Load assigned debates with a filter that matches the judges relation
- [ ] Show a parent only their debate, and open that ballot from the card
- [ ] Let an admin who is a judge start from their own debate card
- [ ] Verify as a non-admin judge, including after UTC midnight
