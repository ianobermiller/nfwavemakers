---
# nfw-tp6y
title: Load ballot lists in a few requests
status: completed
type: bug
priority: high
created_at: 2026-11-04T05:48:09Z
updated_at: 2026-11-04T05:51:32Z
---

Ballot list screens ask PocketBase for each ballot's debate and speaker scores separately, so a dashboard or the all-ballots page waits on one request per ballot.

- [x] Join each ballot list with one debate query and one speaker-score query
- [x] Skip speaker scores on screens that only show the debate and judge
- [x] Cover the join with a unit test that fails if it fetches per ballot

## Summary of Changes

Ballot list loaders used to fetch each ballot's debate and speaker scores in separate requests. They now join with one debate query and one speaker-score query for the whole list. Dashboard and stranded lists skip speaker scores entirely. Unit tests in `ballots/lib/ballotHydrate.test.ts` assert the loaders run once per list.
