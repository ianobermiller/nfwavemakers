---
# nfw-be3m
title: Style Manage Users filters as a toggle group with fuzzy search
status: completed
type: feature
priority: normal
created_at: 2026-10-24T12:48:15Z
updated_at: 2026-10-24T14:29:29Z
---

Style the Manage Users Students / Parents / Admins / Archived control as a single toggle button group, and add a fuzzy search that filters the current list by name and email.

- [x] Restyle the view switcher as a joined toggle button group
- [x] Filter the current view with a fuzzy search on name and email
- [x] Verify the control and search in the browser

## Summary of Changes

Manage Users now uses one segmented toggle for Students, Parents, Admins, and Archived. A search field fuzzy-filters that view by name and email, ranking closer matches first. Arrow keys move the selection.

The toggle and search field share one height so they sit on the same center line.

Search now uses fast-fuzzy (Damerau-Levenshtein) instead of the hand-rolled subsequence matcher, so swapped and substituted letters match.
