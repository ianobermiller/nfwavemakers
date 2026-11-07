---
# nfw-dh1i
title: Gate lessons and ballots until approval
status: completed
type: feature
priority: high
created_at: 2026-11-07T12:31:07Z
updated_at: 2026-11-07T12:37:00Z
---

Signed-in accounts can open Lessons before a club admin approves them. Lessons and Ballots should stay closed until the account is approved, with a friendly message explaining what is left.

- [x] Keep lesson notes off the page until the account is approved
- [x] Show the same friendly waiting message on Lessons and Ballots
- [x] Refuse lesson reads in PocketBase until the account is approved

## Summary of Changes

Lessons now use the same membership gate as Ballots: profile setup, then email verification and club Approval, then content. Pending accounts see a shared "Almost there" card that mentions lessons and ballots. PocketBase lesson list/view rules require `approved` and `verified`, matching ballots data access.
