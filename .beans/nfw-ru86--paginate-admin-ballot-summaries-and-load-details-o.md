---
# nfw-ru86
title: Paginate admin ballot summaries and load details on expansion
status: completed
type: task
priority: normal
created_at: 2026-11-21T23:59:06Z
updated_at: 2026-11-22T00:31:29Z
---

Replace full-history admin ballot loading with bounded summary pages, date filters, on-demand debate and student feedback, targeted live refreshes, and dark-mode UI verification.


- [x] Add server-side summary views and indexes.
- [x] Paginate summary/detail lists and scope live refreshes.
- [ ] Verify browser behavior and capture dark-mode states.
- [x] Run build/check and commit the completed work.

## Summary of Changes

Replaced full-history admin ballot queries with admin-only PocketBase summary views and indexed counts. Debate and student summaries, expanded feedback, and stranded ballots load 20 records per page. Debate date filters, inline loading/errors and retries, conditional detail mounting, scoped/coalesced live refreshes, and ballot reassignment updates are covered. Removed legacy full-history admin APIs and hooks.

Verification: npm run build, npm run check, and npm run test:unit pass; full Playwright suite passes with 42 passed and 4 intentional project-specific skips. Browser checks prove collapsed summaries request no feedback, verify summary/detail pagination, count updates, access rules, retry, phone layout, and stranded delete/undo. SQLite query plans use the new summary indexes. Dark-mode screenshots cover lists, expanded feedback, pagination, loading, empty/error states, and delete/undo.

The local test runner now links real migrations/hooks beside its disposable database and recreates legacy replay-only test data once; fresh startup and the legacy transition were verified. Local preview: http://localhost:5173/admin-ballots, with isolated PocketBase on port 18096. Deploy the new PocketBase migration with the frontend.
