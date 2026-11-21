---
# nfw-dcd2
title: Let judges choose team speaker order on ballots
status: completed
type: feature
priority: normal
created_at: 2026-11-21T22:51:40Z
updated_at: 2026-11-21T23:08:08Z
---

Remove first/second speaker labels from debate setup. On Team Policy ballots, require a who-speaks-first choice per team, preserving student scores and feedback when reordered. Verify build, checks, behavior, and screenshots.

## Summary of Changes

- Setup now selects a student and partner without assigning speaking order.
- Team Policy judges choose who speaks first per team; both choices are required before submission and saved with the ballot and local draft.
- Order corrections preserve student scores, feedback, and ranks. Roster ordering no longer overrides judge choices; membership changes clear the affected choice.
- Added PocketBase migration for saved choices and fixed local schema replay to apply migrated batch-save settings.
- Verified production build, project checks, 72 unit tests, and 6 desktop/mobile browser tests covering setup, ordering, persistence, submission, and Lincoln-Douglas. Captured screenshots in /tmp/nfw-dcd2-*.png.

### Landing verification

Named the ballot save status for accessible, unambiguous assertions. Isolated speaker-order test students and scoped the existing feedback assertion to the submitted-ballot button so upcoming rounds cannot collide. Full browser suite: 37 passed, 1 intentionally skipped. Build and project checks passed.
