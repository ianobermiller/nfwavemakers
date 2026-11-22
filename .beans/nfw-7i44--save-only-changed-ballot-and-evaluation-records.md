---
# nfw-7i44
title: Save only changed ballot and evaluation records
status: todo
type: task
priority: normal
created_at: 2026-11-22T01:16:20Z
updated_at: 2026-11-22T01:16:20Z
blocked_by:
    - nfw-0i7n
---

Write only records changed from acknowledged persisted state. Keep batch atomicity, new and empty seats, all scores/ranks, stable IDs, retries, local recovery, submission and edits during saves. Acknowledged state changes only after success; submission must not be overwritten by pending autosave. Prove decision-only, single-eval, rank, retry, new ballot and concurrent edit/submit cases.

- [ ] Implement scoped improvement.
- [ ] Prove behavior and request/query shape.
- [ ] Pass npm run build and npm run check from workspace root.
- [ ] Capture dark-mode screenshots of affected states.
- [ ] Complete bean with Summary of Changes and commit with bean ID.
