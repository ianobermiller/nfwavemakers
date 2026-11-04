---
# ballots-rs4w
title: Rethink New Round flow
status: completed
type: feature
priority: normal
created_at: 2026-09-04T15:17:24Z
updated_at: 2026-11-04T16:26:19Z
parent: ballots-an32
---

Problem: New Round is confusing. It should only be an escape hatch for judges when their debate was too ad-hoc and not already set up.

Options:
- Hide or restrict to judge role only
- Remove entirely if debates are always pre-configured

Acceptance:
- Clarify or remove the New Round entry point so normal flows do not expose it.

## Summary of Changes

Done under root bean nfw-67dx. Judge a Round and New Round are gone. A ballot must belong to a debate an admin already created.
