---
# nfw-saa1
title: Load lesson metadata separately from article bodies
status: completed
type: task
priority: normal
created_at: 2026-11-22T01:16:19Z
updated_at: 2026-11-22T01:21:18Z
---

Add typed lesson metadata and metadata-only listing/navigation requests; fetch body only for article/editor. Render article independently of catalog loading/failure. Preserve all seasons, ordering, previous/next links, CRUD live updates, access approval and editor behavior.

- [x] Implement scoped improvement.
- [x] Prove behavior and request/query shape.
- [x] Pass npm run build and npm run check from workspace root.
- [x] Capture dark-mode screenshots of affected states.
- [x] Complete bean with Summary of Changes and commit with bean ID.

## Summary of Changes

LessonMetadata now describes listing/navigation records separately from full Lesson bodies. listLessons projects only id,year,number,title,date; article and editor requests retain full content. The article no longer reads or waits for the catalog: its navigation has its own Suspense fallback and local retry boundary, retaining the All lessons link during loading/failure. Season sorting, same-season adjacency, membership rules and editor loading remain intact.

Validation: npm run build, npm run check, all 74 unit tests and all 14 lesson browser tests pass. Browser checks exercise the real local PocketBase projection (no body property in returned metadata), member/admin routes, article content during delayed or failed metadata, retry, next/previous navigation and full editor body loading on Chromium and mobile. Screenshots were visually inspected in dark mode. No production data or schema touched.

Dark screenshots: /private/tmp/nfw-saa1-index-{chromium,mobile}.png; /private/tmp/nfw-saa1-editor-{chromium,mobile}.png; /private/tmp/nfw-saa1-article-{chromium,mobile}.png; /private/tmp/nfw-saa1-navigation-pending-{chromium,mobile}.png; /private/tmp/nfw-saa1-navigation-error-{chromium,mobile}.png. Browser test servers stop after verification; run locally in this workspace to review /lessons, /lessons/2026/1 and /lessons/edit/<id>.
