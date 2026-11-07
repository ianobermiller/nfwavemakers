---
# nfw-0o22
title: Put the debate actions menu inside the card
status: completed
type: task
priority: normal
created_at: 2026-11-07T11:42:23Z
updated_at: 2026-11-07T11:47:55Z
---

The three-dot Edit/Delete menu on debate lists sits outside the card, to the right of it. Move it inside the card, on the right side, so it reads as part of the row.

- [x] Place the menu inside the debate card on the right
- [x] Keep Edit and Delete working, and keep a click on the rest of the card opening the debate
- [x] Verify the card layout in the browser (closed and open menu)

## Summary of Changes

`DebateCard` accepts an `actions` slot rendered inside the card on the right. When actions are present, the card surface is a div and the navigate control is an inner button, so the kebab is not nested inside it. `AdminDebateItem` passes the Edit/Delete menu through that slot instead of sitting beside the card.
