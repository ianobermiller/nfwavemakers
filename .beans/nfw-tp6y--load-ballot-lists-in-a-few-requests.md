---
# nfw-tp6y
title: Load ballot lists in a few requests
status: todo
type: bug
priority: high
created_at: 2026-11-04T05:48:09Z
updated_at: 2026-11-04T05:48:09Z
---

Ballot list screens ask PocketBase for each ballot's debate and speaker scores separately, so a dashboard or the all-ballots page waits on one request per ballot.

- [ ] Join each ballot list with one debate query and one speaker-score query
- [ ] Skip speaker scores on screens that only show the debate and judge
- [ ] Cover the join with a unit test that fails if it fetches per ballot
