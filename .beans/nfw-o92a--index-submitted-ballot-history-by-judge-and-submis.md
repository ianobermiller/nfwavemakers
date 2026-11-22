---
# nfw-o92a
title: Index submitted ballot history by judge and submission date
status: completed
type: task
priority: normal
created_at: 2026-11-22T01:16:23Z
updated_at: 2026-11-22T01:46:48Z
blocked_by:
    - nfw-wl3x
---

Inspect real PocketBase history query SQL/plans on a migrated local database with representative fixtures. Add partial (judge, submitted_at DESC, id DESC) index for active submitted ballots if planner proves benefit; verify up/down migration and ordering. Do not change production schema or claim unmeasured speedup.

- [x] Implement scoped improvement.
- [x] Prove behavior and request/query shape.
- [x] Pass npm run build and npm run check from workspace root.
- [x] Capture dark-mode screenshots of affected states.
- [x] Complete bean with Summary of Changes and commit with bean ID.

## Summary of Changes

Added idx_ballots_judge_submitted on (judge, submitted_at DESC, id DESC) with partial predicate submitted_at IS NOT ''. The index excludes drafts but intentionally retains soft-deleted submissions. The initially proposed active/submitted predicate is not selected for PocketBase's actual null-aware filters. The demonstrated predicate supports the real first-page and cursor queries without changing client filters or authorization rules.

Added repeatable proof: POCKETBASE_BIN=/path/to/custom/pocketbase node ballots/scripts/check-judge-history-index.mjs [--screenshots]. It starts only a disposable loopback server, applies actual migrations, creates 8 judges, 96 debates, 768 ballots and 3,072 evaluations, captures real member-authorized SQL from PocketBase debug logs (including ACL joins/DISTINCT), and runs EXPLAIN in PocketBase's own SQLite runtime. It compares baseline/strict-predicate/migrated plans, verifies identical first and cursor results and 40 unique displayed records, executes actual down/up callbacks, and asserts rollback restores original ordering work. Temporary proof endpoints exist only in the disposable directory and require superuser auth.

Evidence: before uses idx_ballots_judge plus temporary trees for DISTINCT and ORDER BY. After uses idx_ballots_judge_submitted; cursor search includes judge=? AND submitted_at<?, and the ORDER BY temporary tree disappears. The existing DISTINCT temporary tree remains because of authorization joins. No latency or speedup measurement is claimed. Actual generated SQL, request parameters, before/after/rollback plans, fixture location and result IDs are written to /private/tmp/nfw-o92a-query-proof.json.

npm run build and npm run check pass. Browser screenshots show the indexed judge history in dark desktop/mobile and a generated diagnostic view of actual plans: /private/tmp/nfw-o92a-judge-desktop.png, /private/tmp/nfw-o92a-judge-mobile.png and /private/tmp/nfw-o92a-query-plans.png. Temporary servers are stopped. No production schema or service changed. Ready for local /ballots review; not landed.
