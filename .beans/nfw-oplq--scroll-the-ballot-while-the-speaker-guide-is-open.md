---
# nfw-oplq
title: Scroll the ballot while the speaker guide is open
status: completed
type: bug
priority: normal
created_at: 2026-11-04T01:54:10Z
updated_at: 2026-11-04T03:38:43Z
---

On a desktop, opening the speaker point guide locks the ballot page. The guide is a side panel, so the page behind it should keep scrolling. On a phone the guide stays a modal sheet and can keep the page still.

- [x] Let the ballot scroll on desktop while the guide is open
- [x] Keep the phone sheet from scrolling the page behind it

## Summary of Changes

On desktop the speaker guide is a non-modal side panel, so the ballot keeps scrolling and stays usable. The phone sheet is still a modal and keeps the page still.
