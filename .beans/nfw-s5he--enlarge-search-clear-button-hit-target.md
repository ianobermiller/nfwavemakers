---
# nfw-s5he
title: Enlarge search clear button hit target
status: completed
type: bug
priority: normal
created_at: 2026-11-21T22:46:57Z
updated_at: 2026-11-21T22:49:33Z
---

Increase the search clear icon hit area while keeping the icon compact. Verify click behavior, build/check, and screenshots.

## Summary of Changes

Replaced native search clear icons in user search and judge search with a shared SearchInput component and a 44 × 44 pixel accessible button. Clearing returns focus to the search field. Added desktop and mobile coverage for edge clicks, keyboard clearing, focus, and empty state. Confirmed the regression check fails with a 16 × 16 target. Build and check pass; captured populated and cleared screenshots.
