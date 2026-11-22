---
# nfw-o92a
title: Index submitted ballot history by judge and submission date
status: todo
type: task
priority: normal
created_at: 2026-11-22T01:16:23Z
updated_at: 2026-11-22T01:16:23Z
blocked_by:
    - nfw-wl3x
---

Inspect real PocketBase history query SQL/plans on a migrated local database with representative fixtures. Add partial (judge, submitted_at DESC, id DESC) index for active submitted ballots if planner proves benefit; verify up/down migration and ordering. Do not change production schema or claim unmeasured speedup.

- [ ] Implement scoped improvement.
- [ ] Prove behavior and request/query shape.
- [ ] Pass npm run build and npm run check from workspace root.
- [ ] Capture dark-mode screenshots of affected states.
- [ ] Complete bean with Summary of Changes and commit with bean ID.
