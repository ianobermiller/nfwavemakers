---
# nfw-w6gf
title: Reduce admin summary refresh requests after loading history
status: todo
type: task
priority: normal
created_at: 2026-11-22T01:16:21Z
updated_at: 2026-11-22T01:16:21Z
blocked_by:
    - nfw-0i7n
---

Avoid sequential traversal of every loaded 20-row page plus full tail page on refresh. Use efficient bounded range fetch or targeted changes; keep retained range, ties, insertions, deleted boundaries, loaded rows, retries and expanded feedback correct. Tail probe should fetch existence-only data where possible. Prove request shape using real PocketBase and preserve cursor race tests.

- [ ] Implement scoped improvement.
- [ ] Prove behavior and request/query shape.
- [ ] Pass npm run build and npm run check from workspace root.
- [ ] Capture dark-mode screenshots of affected states.
- [ ] Complete bean with Summary of Changes and commit with bean ID.
