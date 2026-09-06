---
# ballots-kpq5
title: Apply ballots PocketBase collections
status: completed
type: task
priority: normal
created_at: 2026-09-06T18:07:56Z
updated_at: 2026-09-06T18:11:41Z
---

Apply the ballots collections schema to the live PocketBase instance.

- [x] Locate superuser credentials and confirm collections are missing
- [x] Apply pocketbase/pb_migrations/1788667200_ballots_collections.js
- [x] Enable batch API if needed
- [x] Confirm collections exist on pb.obermillers.com

## Summary of Changes

Applied the ballots schema to https://pb.obermillers.com via the collections API (superuser). Created `ballots_profiles`, `ballots_debates`, `ballots_ballots`, and `ballots_speaker_evals` with the migration rules and indexes, then enabled the batch API (`maxRequests` 50). The shared `users` collection was not modified.
