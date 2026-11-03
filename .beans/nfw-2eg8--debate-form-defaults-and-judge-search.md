---
# nfw-2eg8
title: Debate form defaults and judge search
status: completed
type: feature
priority: normal
created_at: 2026-11-03T20:47:27Z
updated_at: 2026-11-03T20:52:34Z
---

Creating a debate asks for a resolution that stays the same all year, starts with a blank date, and lists judges with no search and no last-name order.

- [x] Default the date to the next Tuesday, or today when today is Tuesday
- [x] Remove the resolution field from the debate form
- [x] Make judges searchable and sort them by last name
- [x] Verify the form in the browser

## Summary of Changes

New debates default the date to the next Tuesday (today when it is Tuesday). The resolution field is gone from the create/edit form; saves leave any stored resolution alone. The judges picker is fuzzy-searchable and lists people by last name.
