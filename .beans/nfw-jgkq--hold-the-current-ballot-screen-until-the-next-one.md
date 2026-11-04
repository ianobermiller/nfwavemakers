---
# nfw-jgkq
title: Hold the current ballot screen until the next one is ready
status: todo
type: feature
priority: normal
created_at: 2026-11-04T04:56:08Z
updated_at: 2026-11-04T04:56:08Z
---

Navigating between ballot screens swaps in an empty page, then each query paints on its own. Hold the current screen until the next one is ready, and reveal a screen's data together.

- [ ] Suspend live queries on a cache miss and keep PocketBase updates from suspending again
- [ ] Transition route changes so the current screen stays up until the next one can render
- [ ] Show one route-level fallback and error state instead of per-screen Loading text
- [ ] Verify navigation between dashboard, a debate, and a ballot
