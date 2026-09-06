---
# ballots-y84i
title: Migrate ballots from Convex to PocketBase
status: in-progress
type: feature
priority: normal
created_at: 2026-09-06T03:56:16Z
updated_at: 2026-09-06T12:08:17Z
---

Replace the Convex backend with the configured PocketBase instance at pb.obermillers.com, refactoring the application around PocketBase-native authentication, data access, realtime, and deployment patterns.

- [x] Inventory current Convex schema, functions, auth, and client usage
- [x] Design PocketBase collections, rules, and application boundaries
- [x] Implement PocketBase client, auth, and data repositories
- [x] Remove Convex runtime and generated-code dependencies
- [x] Migrate configuration and documentation
- [ ] Verify lint, types, tests, build, and key user flows

## Verification

Static checks and the production build pass. Live flow verification remains open because the `ballots_profiles`, `ballots_debates`, `ballots_ballots`, and `ballots_speaker_evals` collections are not yet installed on pb.obermillers.com (their public record endpoints currently return 404), and no PocketBase superuser credentials are available locally. Apply `pocketbase/pb_migrations/1788667200_ballots_collections.js`, enable the batch API, and then run the e2e suite against a configured test instance.

## Follow-up

There is no production Convex data to import. Passkey sign-in will be wired to PocketBase in a later change.

## Shared-instance isolation

All app-owned collections now use the `ballots_` prefix. Ballot profile data lives in `ballots_profiles`; the shared `users` auth collection is referenced but not modified.
