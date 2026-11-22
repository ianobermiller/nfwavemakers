---
# nfw-w6gf
title: Reduce admin summary refresh requests after loading history
status: completed
type: task
priority: normal
created_at: 2026-11-22T01:16:21Z
updated_at: 2026-11-22T01:39:26Z
blocked_by:
    - nfw-0i7n
---

Avoid sequential traversal of every loaded 20-row page plus full tail page on refresh. Use efficient bounded range fetch or targeted changes; keep retained range, ties, insertions, deleted boundaries, loaded rows, retries and expanded feedback correct. Tail probe should fetch existence-only data where possible. Prove request shape using real PocketBase and preserve cursor race tests.

- [x] Implement scoped improvement.
- [x] Prove behavior and request/query shape.
- [x] Pass npm run build and npm run check from workspace root.
- [x] Capture dark-mode screenshots of affected states.
- [x] Complete bean with Summary of Changes and commit with bean ID.

## Summary of Changes

All three admin summary lists (Manage Debates, ballots by debate, ballots by student) opt in to 100-row retained-range refreshes and a separate one-row fields:id existence probe without expansions. Initial pages and Load more remain20 rows plus one lookahead, always page1 with keyset filters and skipTotal. Larger retained ranges continue through bounded cursor requests. The generic createCursorList option is backward compatible; dashboard history callers remain unchanged unless explicitly opted in.

Real PocketBase proof seeds85 students/debates/ballots/evaluations. For each screen,80 loaded unique rows refresh after one record edit using exactly two summary calls (perPage101 range plus perPage1 id-only probe), retaining all80 IDs/order. Expanded feedback survives refresh; a failed probe retains old rows and expansion, and retry updates the record without dropping data. Unit coverage also proves240-row bounded traversal and cursor retention after probe failure. Existing tied-key, live insertion/deleted-boundary, append-retry and delete/undo browser checks pass.

Validation: npm run build, npm run check,88 unit tests pass. The full browser run exits successfully with48 passed,6 intended skips and1 existing judge-search test passing on retry after a navigation timeout. The new proof passes first try in both the full run and standalone. It is isolated in the admin-refresh Playwright project, depending on chromium/mobile so other temporary global summary fixtures are cleaned before exact row/request assertions. Existing project parallelism stays intact. Standalone rerun: POCKETBASE_BIN=/Users/iobermiller/dev/personal/nfwavemakers/pocketbase/pocketbase npx playwright test --project=admin-refresh --no-deps --workers=1.

Dark screenshots inspected: /private/tmp/nfw-w6gf-{manage,debate,student}-{refreshed,load-more}.png; /private/tmp/nfw-w6gf-refresh-error.png; /private/tmp/nfw-w6gf-retry-mobile.png. Original admin tests also capture dark loading/error/empty/mobile states against this implementation. No migration or production access. Inherited prerequisites: realtime f1c9f7a3fa7826cb80d41176daca1cfee1550759 and Manage Debates6105261a1ef5e1a55909c60fc8bf6d001a438ca6; integrate this bean's own commit separately. Test servers stopped after checks.
