---
# nfw-jgkq
title: Hold the current ballot screen until the next one is ready
status: completed
type: feature
priority: normal
created_at: 2026-11-04T04:56:08Z
updated_at: 2026-11-04T05:18:26Z
---

Navigating between ballot screens swaps in an empty page, then each query paints on its own. Hold the current screen until the next one is ready, and reveal a screen's data together.

- [x] Suspend live queries on a cache miss and keep PocketBase updates from suspending again
- [x] Transition route changes so the current screen stays up until the next one can render
- [x] Show one route-level fallback and error state instead of per-screen Loading text
- [x] Verify navigation between dashboard, a debate, and a ballot

## Summary of Changes

Ballot queries suspend on a cache miss and route changes are transitions, so the current screen stays up until the next one can render. A cold load, when nothing is on screen yet, shows a skeleton for that route instead of an empty page: dashboard cards, a debate or ballot detail, or the lessons hero. PocketBase subscription updates still paint in place and do not bring the skeleton back.
