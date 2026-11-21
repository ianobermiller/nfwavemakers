---
# nfw-w8pe
title: Add right spacing to select dropdown arrows
status: completed
type: bug
priority: normal
created_at: 2026-11-21T22:47:28Z
updated_at: 2026-11-21T22:50:42Z
---

Inset the Role dropdown arrow from the right border using the shared Select component. Verify the affected dropdown visually and run build and check.

## Summary of Changes

Updated the shared Select with a chevron inset 12px from the right and 40px of text padding. Preserved native select semantics. Verified Role, Category, and compact Rank component previews in light and dark themes, including selecting options. npm run build and npm run check passed. Screenshots: /tmp/nfw-w8pe-dark.png and /tmp/nfw-w8pe-light.png.
