---
# nfw-m3xk
title: Tighten fuzzy search cutoff
status: completed
type: bug
priority: normal
created_at: 2026-11-21T22:46:29Z
updated_at: 2026-11-21T22:51:10Z
---

Reject weak fuzzy search matches while preserving useful name lookups and small typos. Verify with regression tests, build/check, and screenshots.

## Summary of Changes

Raised the shared fuzzy search cutoff from 0.6 to 0.8 for Manage Users and the judge picker. Added regressions for weak short queries, per-word cutoff enforcement, exact partial matches, and longer-name typos. The previous 0.6 threshold admitted unrelated names for short misspellings.

Validation: npm run build, npm run check, all 69 unit tests, and a browser check against throwaway local PocketBase passed. Reviewed screenshots for matching and empty results in both affected screens; saved under /tmp/nfw-m3xk-review/.

Recorded the user preference in AGENTS.md: always show dark mode screenshots.
