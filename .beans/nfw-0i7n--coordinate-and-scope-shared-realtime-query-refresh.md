---
# nfw-0i7n
title: Coordinate and scope shared realtime query refreshes
status: completed
type: task
priority: high
created_at: 2026-11-22T01:16:15Z
updated_at: 2026-11-22T01:44:21Z
---

Use one per-key refresh coordinator and shared subscriptions. Coalesce bursts, deduplicate or serialize loads, reject stale and previous-auth completions, safely filter events. Preserve Suspense, freshness, background errors and recovery. Prove concurrent consumers, burst events, in-flight invalidation, auth transitions and error retry.

- [x] Implement scoped improvement.
- [x] Prove behavior and request/query shape.
- [x] Pass npm run build and npm run check from workspace root.
- [x] Capture dark-mode screenshots of affected states.
- [x] Complete bean with Summary of Changes and commit with bean ID.


## Summary of Changes

Generic live queries now share one subscription lifecycle and refresh loop per cache key. Realtime bursts coalesce for 100ms; invalidations during a request queue one follow-up and prevent publishing the invalidated result. Every mounted consumer is notified from shared cache writes. Last-unmount and auth cache clearing stop watchers and invalidate pending refreshes. Initial Suspense requests check exact entry identity, so a previous login cannot overwrite a new same-key request. Preload failures remain available to the route retry boundary without unhandled promise rejections. Detail/debate/draft/individual lesson queries filter events to their records and expanded members, including records moved out of the loaded scope.

Validation: npm run build and npm run check pass; all 85 unit tests pass, including 15 live-query/event tests. A real local PocketBase fixture and desktop/mobile browser check prove a five-update batch triggers one ballot reload, updated feedback renders, related updates remain live, persisted auth survives reload, lessons navigation and return work, logout followed by another edit produces no browser error. Six dark screenshots cover initial/updated ballot and sign-out on desktop/mobile at /private/tmp/nfw-0i7n-{ballot,updated,signout}-{chromium,mobile}.png. Browser servers stopped after checks. No production services changed.


### Browser verification stabilization

The realtime browser check installs a paused debounce clock before the ballot detail mounts and drains StrictMode startup revalidation with an acknowledged sentinel update. CDP Network.eventSourceMessageReceived observes messages on the actual app EventSource in both development and built production preview; no app-source imports or product debug globals are required. All five burst events must arrive before the test advances the 100ms debounce and asserts exactly one request. An unrelated evaluation is delivered and its own debounce window advanced before any related event is sent, so coalescing cannot mask a bad invalidation. The fixture uses its own student to avoid adding cards to the shared seeded student's concurrent dashboard tests. Product code is unchanged.

Validation: build/check pass. Concurrent runs of live-query.spec.ts and ballot.spec.ts on desktop/mobile with four workers pass 25 tests with one intentional mobile passkey skip in development, and independently pass 25 tests with the same skip under PLAYWRIGHT_PREVIEW=1. Existing deterministic unit burst coverage remains unchanged. The route-splitting commit was inherited only to run its production-preview configuration; this follow-up commit contains only the realtime browser spec and bean summary.
