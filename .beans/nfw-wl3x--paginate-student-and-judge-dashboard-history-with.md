---
# nfw-wl3x
title: Paginate student and judge dashboard history with summary fields
status: todo
type: task
priority: high
created_at: 2026-11-22T01:16:17Z
updated_at: 2026-11-22T01:16:17Z
blocked_by:
    - nfw-u466
    - nfw-0i7n
---

Bound student and judge histories with deterministic cursor pagination and Load more. Query submitted ballots through speaker relation rather than fetching evaluation bodies for IDs. Fetch summary fields without feedback text. Preserve grouping by debate, judge names, permissions, inserts, deleted records and retry. Assigned/open debates must remain correct despite partially loaded submitted history; historical submissions must not reappear as open.

- [ ] Implement scoped improvement.
- [ ] Prove behavior and request/query shape.
- [ ] Pass npm run build and npm run check from workspace root.
- [ ] Capture dark-mode screenshots of affected states.
- [ ] Complete bean with Summary of Changes and commit with bean ID.
