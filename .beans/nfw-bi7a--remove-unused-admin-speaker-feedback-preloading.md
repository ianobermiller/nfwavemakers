---
# nfw-bi7a
title: Remove unused admin speaker feedback preloading
status: completed
type: task
priority: normal
created_at: 2026-11-22T01:16:24Z
updated_at: 2026-11-22T01:26:29Z
---

Remove speaker-ballots preloading for admin dashboards which render AdminDashboard and ParentDashboard, not StudentDashboard. Preserve useful parallel preloads. Verify query behavior by role and dark admin dashboard.

- [x] Implement scoped improvement.
- [x] Prove behavior and request/query shape.
- [x] Pass npm run build and npm run check from workspace root.
- [x] Capture dark-mode screenshots of affected states.
- [x] Complete bean with Summary of Changes and commit with bean ID.

## Summary of Changes

Speaker-feedback data is preloaded only for student dashboards, matching the rendered sections. Admins retain upcoming debates, assigned debates and submitted-ballot preloads; parents retain assigned/submitted data; student upcoming and feedback loads remain parallel.

Validation: npm run build and npm run check pass. Six browser tests against isolated PocketBase cover desktop/mobile dashboards for admin, student and parent/judge. Admin and parent dashboards make no speaker_evals records query; student feedback still loads evaluations and debates. The tests record actual browser requests and capture dark CSS-scale screenshots at /private/tmp/nfw-bi7a-{admin,student,judge}-{chromium,mobile}.png. No production services contacted and no server left running. Ready for local review at /ballots; not landed.
