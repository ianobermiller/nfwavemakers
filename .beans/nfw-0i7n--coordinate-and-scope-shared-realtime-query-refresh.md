---
# nfw-0i7n
title: Coordinate and scope shared realtime query refreshes
status: todo
type: task
priority: high
created_at: 2026-11-22T01:16:15Z
updated_at: 2026-11-22T01:16:15Z
---

Use one per-key refresh coordinator and shared subscriptions. Coalesce bursts, deduplicate or serialize loads, reject stale and previous-auth completions, safely filter events. Preserve Suspense, freshness, background errors and recovery. Prove concurrent consumers, burst events, in-flight invalidation, auth transitions and error retry.

- [ ] Implement scoped improvement.
- [ ] Prove behavior and request/query shape.
- [ ] Pass npm run build and npm run check from workspace root.
- [ ] Capture dark-mode screenshots of affected states.
- [ ] Complete bean with Summary of Changes and commit with bean ID.
