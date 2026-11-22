---
# nfw-7i44
title: Save only changed ballot and evaluation records
status: completed
type: task
priority: normal
created_at: 2026-11-22T01:16:20Z
updated_at: 2026-11-22T01:34:03Z
blocked_by:
    - nfw-0i7n
---

Write only records changed from acknowledged persisted state. Keep batch atomicity, new and empty seats, all scores/ranks, stable IDs, retries, local recovery, submission and edits during saves. Acknowledged state changes only after success; submission must not be overwritten by pending autosave. Prove decision-only, single-eval, rank, retry, new ballot and concurrent edit/submit cases.

- [x] Implement scoped improvement.
- [x] Prove behavior and request/query shape.
- [x] Pass npm run build and npm run check from workspace root.
- [x] Capture dark-mode screenshots of affected states.
- [x] Complete bean with Summary of Changes and commit with bean ID.


## Summary of Changes

Autosave compares normalized ballot and evaluation bodies with the last acknowledged server snapshot, writing only changed rows in an atomic PocketBase batch. A decision-only edit writes one ballot; an evaluation-only edit writes that evaluation; normalized no-ops send no batch. New IDs are reserved and persisted locally before network I/O and upserted, so retries after a committed write with a lost response reuse the same records. Failed saves retain the acknowledged baseline; successful in-flight snapshots leave later edits dirty.

Final submission freezes editable controls, waits for the active draft save, and submits the latest refs after cancelling queued follow-ups. Draft writes omit submitted_at entirely, preventing a late draft write from clearing submission. The editor keeps the same identity when its first draft appears through realtime, preserving its in-flight promise and edit state. Unmounted editors do not schedule retry/follow-up work. Local-restored edits compare against serverInitial rather than the restored local snapshot.

Validation: npm run build and npm run check pass; all 94 unit tests pass. Four local PocketBase browser tests pass across desktop and mobile, checking exact batch contents, normalized no-op, error/retry, a held save plus later edit and submit, no post-submit draft batch, and successful retry after PocketBase commits creation but the response is replaced by a 503. All six existing speaking-order/LD browser tests also pass. Dark screenshots at /private/tmp/nfw-7i44-{saved,saving,retry,submitted,creation-retry}-{chromium,mobile}.png. All test servers stopped. No production changes.
