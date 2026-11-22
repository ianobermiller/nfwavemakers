---
# nfw-u466
title: Paginate Manage Debates with lightweight ballot summaries
status: todo
type: task
priority: high
created_at: 2026-11-22T01:16:16Z
updated_at: 2026-11-22T01:16:16Z
---

Replace full debate/ballot downloads and nested scans with bounded cursor summaries and PocketBase counts. Counts must include drafts. Preserve deterministic date/id order, create/edit/delete/undo and realtime updates. Fetch IDs on deletion only, keeping atomic deletion and precise undo. Verify migrations, real PocketBase permissions and pagination.

- [ ] Implement scoped improvement.
- [ ] Prove behavior and request/query shape.
- [ ] Pass npm run build and npm run check from workspace root.
- [ ] Capture dark-mode screenshots of affected states.
- [ ] Complete bean with Summary of Changes and commit with bean ID.
