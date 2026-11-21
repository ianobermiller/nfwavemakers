---
# nfw-d998
title: Show friendly speaker ranking and points mismatch banner
status: completed
type: feature
priority: normal
created_at: 2026-11-21T22:53:16Z
updated_at: 2026-11-21T22:58:06Z
---

Show succinct, non-blocking info when chosen speaker rankings disagree with completed point totals. Check official NCFCA guidance; verify build, checks, and dark mode screenshots.

## Summary of Changes

Added a polite, non-blocking blue info banner above ballot submission when completed speaker scores disagree with chosen rankings. Equal point totals and unfinished scoring do not trigger it; ranking and score changes update it immediately. Used original succinct copy because official NCFCA override wording applies to speech ballots, not debate ballots.

Verified npm run build and npm run check. Temporary Playwright checks passed on desktop Chromium and mobile Chrome against an isolated local PocketBase: incomplete scoring, matching order, conflicting ranks, auto-rank, tied totals, score edits, and submission availability. Captured dark mode screenshots in /tmp/nfw-d998-*.png.

Softened the banner to reassure judges: “That’s OK, but please double-check that this reflects your intended order.” Reverified build, checks, and dark mode desktop/mobile screenshots.
