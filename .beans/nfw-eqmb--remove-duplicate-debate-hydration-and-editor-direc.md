---
# nfw-eqmb
title: Remove duplicate debate hydration and editor directory dependencies
status: completed
type: task
priority: normal
created_at: 2026-11-22T01:16:22Z
updated_at: 2026-11-22T02:08:04Z
blocked_by:
    - nfw-wl3x
    - nfw-7i44
---

Reuse loaded debate in detail hydration and parallelize independent work. Remove full member-directory prerequisite for locked ballot editor with expanded teams; use known members and preserve archived speakers, avatars and live rematching. Avoid duplicate same-key consumers where useful. Prove editor first load, debate detail, live teams and permissions.

- [x] Implement scoped improvement.
- [x] Prove behavior and request/query shape.
- [x] Pass npm run build and npm run check from workspace root.
- [x] Capture dark-mode screenshots of affected states.
- [x] Complete bean with Summary of Changes and commit with bean ID.

## Summary of Changes

Debate detail starts the debate and ballot-record requests independently, begins evaluation loading as soon as ballot IDs arrive, and attaches the already-loaded debate without another debate query. Removed the now-single-use listBallots wrapper. The editor loader owns the live debate resource and passes its required Debate to the editor; the locked roster uses expanded team members rather than waiting for a club-directory request. Archived members, avatars, profile renames, live team rematching and saved notes are preserved. Missing/deleted debates show a missing state instead of opening an unlocked editor. Existing draft/local recovery, acknowledged-save snapshots and submit serialization remain intact.

This workspace assembles all ten performance beans plus the realtime and history verification follow-ups into one review branch. Integration checks exposed fixture collisions rather than a cursor defect: Manage Debates fixtures dated2042 legitimately displaced All Ballots fixtures dated2040, and shared feedback fixtures produced two legitimate relogin groups. Summary suites now run in device-specific workers1 phases after the ordinary parallel projects; the large refresh proof runs last. Device-based skips and normalized screenshot names preserve all cases and original image paths. Histories use private fixtures and exact group IDs. A retained empty range with older data no longer claims the entire collection is empty. The realtime test explicitly detaches its CDP session and resumes its clock during cleanup.

Validation: npm run build, npm run check,99 unit tests, and the real PocketBase index/migration proof pass. The final NORMAL full production-preview browser run exited0 with89 passed,8 intentional device-specific skips,0 failures and0 flakes. Raw report: /private/tmp/nfw-performance-final-results.json; commands/output: /private/tmp/nfw-performance-final-checks.log. A subsequent screenshot-only history framing follow-up passed all4 focused cases, recorded separately in /private/tmp/nfw-performance-screenshot-results.json. Real editor tests reject all directory-list requests yet render an archived speaker and avatar, preserve notes through a live team change and rename, reload saved data, prove parallel detail/evaluation reads while the debate header is held, and exercise missing debates on desktop/mobile.

Earlier diagnostic attempts are retained separately. Written premise: cross-project worker turnover, rather than an active app test, caused an earlier worker exit stall. Explicit single-project runners all exited0, supporting but not isolating that premise because CDP resource cleanup also changed. The final normal suite now exits cleanly after cleanup and fixture isolation; no assertion was weakened. Diagnostic artifacts: /private/tmp/nfw-performance-interrupted-results.json, /private/tmp/nfw-performance-turnover-timeout-results.json, /private/tmp/nfw-performance-separate-project-results.json and /private/tmp/nfw-performance-diagnostic-checks.log. Only the workspace-generated disposable test DB was reset before final validation; no main/user/production data was touched.

Dark screenshots inspected: /private/tmp/nfw-eqmb-{editor,live-team,detail-loading,detail,missing}-{chromium,mobile}.png. A separate fresh review backend and production preview remain running at http://127.0.0.1:59555 (backend59554), with24 historical rounds,27 debates, more than20 student summaries and an open editor. Logins admin@example.com, judge@example.com and student@example.com all use test-password. Editor /judge/ldxl4fazgnur82f; existing draft /judge/trn0obijg6h1gx5. Review data: /private/tmp/nfw-performance-preview-XX0sZa; metadata/PIDs/routes: /private/tmp/nfw-performance-preview.json. Browser smoke checks verified all three roles, history pagination, admin summaries, editor and lessons; /private/tmp/nfw-performance-preview-checks.json. This preview uses generated local data only. No landing or deployment performed.
