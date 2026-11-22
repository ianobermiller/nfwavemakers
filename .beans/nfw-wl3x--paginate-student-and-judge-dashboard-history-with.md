---
# nfw-wl3x
title: Paginate student and judge dashboard history with summary fields
status: completed
type: task
priority: high
created_at: 2026-11-22T01:16:17Z
updated_at: 2026-11-22T01:38:57Z
blocked_by:
    - nfw-u466
    - nfw-0i7n
---

Bound student and judge histories with deterministic cursor pagination and Load more. Query submitted ballots through speaker relation rather than fetching evaluation bodies for IDs. Fetch summary fields without feedback text. Preserve grouping by debate, judge names, permissions, inserts, deleted records and retry. Assigned/open debates must remain correct despite partially loaded submitted history; historical submissions must not reappear as open.

- [x] Implement scoped improvement.
- [x] Prove behavior and request/query shape.
- [x] Pass npm run build and npm run check from workspace root.
- [x] Capture dark-mode screenshots of affected states.
- [x] Complete bean with Summary of Changes and commit with bean ID.

## Summary of Changes

Student feedback pages whole debate groups through a private student_feedback_summaries view, returning all judge names for each group without ballot/evaluation body reads. Stranded/deleted-debate ballots retain individual fallback routes. Judge history uses fields-only submitted-ballot requests with submitted_at/id cursors. Both lists load 20 rows with a 21st lookahead, skip totals, append via Load more and retain loaded ranges across live updates. A private judge_open_debates view independently excludes any own active submitted ballot, so paginated history cannot make old submissions reappear as open assignments. Initial queries still preload in parallel. History source caches clear on signout/identity changes; generation/identity guards reject pending data across same-user relogin. The serialized query hook also captures its auth identity. Removed obsolete full-history APIs/hooks and adapted inherited preload assertions and old dashboard test to bounded history.

Validation: npm run build and npm run check pass. All 87 unit tests pass; full browser suite passes with 60 passed and 8 intentional project-specific skips. Focused real PocketBase checks cover 23 tied-date debate groups with two judges each, 23 judge submissions, bounded/projection-only query shape, no student-list ballot/evaluation reads, no judge evaluation reads, old submitted assignments independent of the first page, live deletion/restoration, complete unique groups, judge name changes, deleted cursor boundary, failed append retry from same cursor, initial errors/retry, cross-student and cross-judge denial, approval revocation using existing auth tokens, and same-user signout/relogin with a held initial response on desktop/mobile. Both dashboard migration callbacks execute successfully in a disposable copied PocketBase via temporary local JSVM hook. Production untouched.

The initial full-suite run caught and corrected an inherited test assuming all old submissions were on page one. A separate inherited realtime exact-count assertion observed two loads once under concurrent suite load; its production source/test was left unchanged and the subsequent full suite passes. Unit exact-burst behavior remains covered.

Dark CSS-pixel screenshots: /private/tmp/nfw-wl3x-student-populated.png, -student-more.png, -student-append-error.png, -student-append-loading.png, -judge-populated.png, -judge-more.png; /private/tmp/nfw-wl3x-student-{loading,relogin,error,empty}-{chromium,mobile}.png; /private/tmp/nfw-wl3x-{student,judge,admin}-{chromium,mobile}.png. No dev server left running. Review /ballots or /dashboard as student/parent/admin. Not landed.
