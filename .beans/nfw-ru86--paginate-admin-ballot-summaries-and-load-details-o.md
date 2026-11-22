---
# nfw-ru86
title: Paginate admin ballot summaries and load details on expansion
status: completed
type: task
priority: normal
created_at: 2026-11-21T23:59:06Z
updated_at: 2026-11-22T00:57:30Z
---

Load admin ballot summaries in bounded cursor requests and fetch feedback only when expanded.

- [x] Add admin-only summary views and indexes.
- [x] Replace summary offsets with date/id and name/id cursor filters.
- [x] Append 20 results through Load more, with one lookahead record for hasMore.
- [x] Preserve loaded ranges and expanded feedback across live inserts/deletes.
- [x] Retry failed appends from the same cursor despite background refresh failures.
- [x] Verify tied keys, deleted boundaries, stale requests, mobile layout, dark-mode states, build, and check.

## Summary of Changes

Debate and student summaries use filter-based keyset cursors on PocketBase list requests. Every summary request uses page 1, perPage 21, and skipTotal; only 20 rows are displayed. Date/id descending and name/id ascending provide deterministic ordering. Load more seeks after the saved sort tuple, without offsets. Live refreshes traverse the loaded key range and publish it atomically, retaining existing rows and expanded feedback when newer records arrive or cursor records are deleted. Failed appends retain their cursor and retry intent across background refreshes; obsolete requests cannot overwrite newer cursors. Date filters remain removed. Detail and stranded-ballot pagination, delete/undo, and admin-only authorization remain covered.

Validation: npm run build, npm run check, and all 74 unit tests pass. The full browser suite passes with 43 passed and 5 intentional project-specific skips. A real PocketBase fixture with tied dates and names verifies zero-offset cursor requests, live inserts, deleted cursor boundaries, complete unique results, and retained expansions. Tests also reproduce and cover the append-retry/background-refresh race. Dark-mode screenshots cover both summaries, Load more, loading, retry, and phone layouts.

Local preview: http://localhost:5173/admin-ballots, isolated PocketBase on port 18096. The original summary-view migration accompanies the frontend; the cursor change needs no additional migration.
