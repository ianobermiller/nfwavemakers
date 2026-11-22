---
# nfw-hgsn
title: Analyze site and ballot data loading performance
status: completed
type: task
priority: normal
created_at: 2026-11-22T01:04:37Z
updated_at: 2026-11-22T01:07:01Z
---

Read-only performance review of client loading paths, PocketBase queries, indexes, and realtime refresh behavior. Produce prioritized findings with source evidence; no application changes.

## Summary of Changes

Completed a read-only review of ballot dashboards, editor/detail views, admin summaries/debates/users, lessons, client cache/subscriptions, and PocketBase migrations/deployment. No application code changed.

Priorities: (1) coalesce and scope generic realtime refreshes, share loads per key and reject stale completions; (2) replace Manage Debates full ballot downloads and nested scans with bounded summaries while preserving draft counts and delete/undo behavior; (3) paginate student/judge history and use summary fields rather than feedback text; (4) split lesson metadata from bodies and avoid gating articles on the entire catalog; (5) persist only changed ballot/evaluation rows while keeping atomic writes and retries; (6) optimize loaded-range admin refreshes without losing insert/delete correctness; (7) remove duplicate debate hydration and unnecessary member-directory fetches; (8) consider a judge/submission-date partial index and route-level code splitting. Remove unused admin speaker-ballot preload as a small independent improvement.

Evidence: /private/tmp/nfw-performance-review.mjs runs actual transpiled source functions with simulated hooks/transport: five events start five concurrent loads; an older completion overwrites newer cache data; a full TP save queues five record updates; refreshing 80 loaded summary records uses five sequential page calls. /private/tmp/nfw-performance-query-plans.py reconstructs relevant migration indexes and view SQL in an in-memory SQLite fixture. Existing summary indexes are used; a candidate judge/submitted_at partial index removes the separate ORDER BY sort. These are structural checks, not production timing measurements. Production cardinalities, deployed schema, query latency, network payloads, and React profiles were not measured. No UI changes, build, or screenshots were needed for this analysis.
