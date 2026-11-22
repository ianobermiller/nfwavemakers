---
# nfw-ru86
title: Paginate admin ballot summaries and load details on expansion
status: completed
type: task
priority: normal
created_at: 2026-11-21T23:59:06Z
updated_at: 2026-11-22T00:39:26Z
---

Load admin ballot summaries in bounded requests and fetch feedback only when expanded.

- [x] Add admin-only server-side summary views and indexes.
- [x] Load summaries in batches of 20 with a Load more link.
- [x] Remove date filters and summary Previous/Next controls.
- [x] Keep expanded feedback and existing rows when more results load or fail.
- [x] Paginate feedback details and stranded ballots; scope and coalesce live refreshes.
- [x] Verify behavior, review dark-mode screenshots, and run build/check.

## Summary of Changes

Admin debate and student summaries load 20 rows initially. Load more appends the next batch without replacing existing rows or collapsing feedback. Date filtering and summary page navigation are removed. PocketBase summary views and indexes keep count queries on the server; collapsed lists never request feedback. Detail and stranded-ballot pagination, delete/undo, inline loading/errors, retry, and live count updates remain covered. The local test runner exercises actual migrations/hooks and recreates legacy replay-only test data once.

Validation: npm run build and npm run check pass. The full browser suite passes with 42 passed and 4 intentional project-specific skips. Tests verify append, preserved expansion, incremental loading/retry without losing existing rows, no eager feedback requests, count updates, admin-only rules, and desktop/mobile layout. Dark-mode screenshots cover the new link, loading, appended debate/student rows, append errors, and the simplified phone layout.

Local preview: http://localhost:5173/admin-ballots, isolated PocketBase on port 18096. The new PocketBase migration accompanies the frontend.
