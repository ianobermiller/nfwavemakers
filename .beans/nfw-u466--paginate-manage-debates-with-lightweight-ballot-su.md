---
# nfw-u466
title: Paginate Manage Debates with lightweight ballot summaries
status: completed
type: task
priority: high
created_at: 2026-11-22T01:16:16Z
updated_at: 2026-11-22T01:24:18Z
---

Replace full debate/ballot downloads and nested scans with bounded cursor summaries and PocketBase counts. Counts must include drafts. Preserve deterministic date/id order, create/edit/delete/undo and realtime updates. Fetch IDs on deletion only, keeping atomic deletion and precise undo. Verify migrations, real PocketBase permissions and pagination.

- [x] Implement scoped improvement.
- [x] Prove behavior and request/query shape.
- [x] Pass npm run build and npm run check from workspace root.
- [x] Capture dark-mode screenshots of affected states.
- [x] Complete bean with Summary of Changes and commit with bean ID.

## Summary of Changes

Manage Debates requests 20 summaries with one lookahead using date/id keyset cursors and skipTotal. A new admin-only admin_debate_summaries view counts all active ballots, including drafts, supported by a partial active-ballots/debate index. The list displays ballot counts without downloading ballot or evaluation records. Existing cursor refresh coordination preserves loaded rows. Delete fetches IDs only, then both Manage Debates and Upcoming Debates reuse exactly those IDs for atomic delete and undo; previously deleted ballots stay deleted. Obsolete unbounded useAdminDebates and ballotIds summary fields were removed.

Validation: npm run build and npm run check pass; all 74 unit tests pass. Real migrated PocketBase browser checks pass: 3 passed, 1 intentional skip for running the large desktop fixture only once. Coverage includes tied-date ordering across 23 records, page=1/perPage=21/skipTotal, no ballot/evaluation reads during listing and live count changes, draft/submitted/deleted count semantics, failed append retaining rows and retrying the same cursor, ID-only on-demand deletion, precise undo, student authorization, loading, initial errors/retry, empty and mobile layouts. Both migration callbacks were executed against a disposable copied local PocketBase through a temporary local-only JSVM hook; the down callback removes the view and the up callback restores it. Production was not contacted.

Dark screenshots: /private/tmp/nfw-u466-populated.png, /private/tmp/nfw-u466-load-more.png, /private/tmp/nfw-u466-append-error.png, /private/tmp/nfw-u466-append-loading.png, /private/tmp/nfw-u466-menu.png, /private/tmp/nfw-u466-undo.png, /private/tmp/nfw-u466-chromium.png, /private/tmp/nfw-u466-mobile.png, /private/tmp/nfw-u466-error-chromium.png, /private/tmp/nfw-u466-error-mobile.png, /private/tmp/nfw-u466-loading-chromium.png, /private/tmp/nfw-u466-loading-mobile.png, /private/tmp/nfw-u466-empty-chromium.png, /private/tmp/nfw-u466-empty-mobile.png. Screenshots use CSS pixel scale and dark mode. No dev server left running. Ready for the user's local review at /admin; not landed.
