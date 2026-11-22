---
# nfw-fs3x
title: Split route code so public pages defer ballot and admin screens
status: todo
type: task
priority: normal
created_at: 2026-11-22T01:16:25Z
updated_at: 2026-11-22T01:16:25Z
---

Lazy-load route screens with existing Suspense, skeletons and error boundaries. Public entry must defer ballot/admin/editor screen chunks. Preserve auth and membership gates, navigation, titles, cold/warm deep links and nonblank transitions. Inspect built output and exercise public/member/admin/lesson routes. Avoid unrelated router rewrite.

- [ ] Implement scoped improvement.
- [ ] Prove behavior and request/query shape.
- [ ] Pass npm run build and npm run check from workspace root.
- [ ] Capture dark-mode screenshots of affected states.
- [ ] Complete bean with Summary of Changes and commit with bean ID.
