---
# nfw-bi7a
title: Remove unused admin speaker feedback preloading
status: todo
type: task
priority: normal
created_at: 2026-11-22T01:16:24Z
updated_at: 2026-11-22T01:16:24Z
---

Remove speaker-ballots preloading for admin dashboards which render AdminDashboard and ParentDashboard, not StudentDashboard. Preserve useful parallel preloads. Verify query behavior by role and dark admin dashboard.

- [ ] Implement scoped improvement.
- [ ] Prove behavior and request/query shape.
- [ ] Pass npm run build and npm run check from workspace root.
- [ ] Capture dark-mode screenshots of affected states.
- [ ] Complete bean with Summary of Changes and commit with bean ID.
