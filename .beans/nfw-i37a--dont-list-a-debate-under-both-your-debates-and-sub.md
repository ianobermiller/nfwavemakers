---
# nfw-i37a
title: Don't list a debate under both Your Debates and Submitted Ballots
status: completed
type: bug
priority: normal
created_at: 2026-11-04T16:14:35Z
updated_at: 2026-11-04T16:20:21Z
---

A debate stays in Your Debates after its ballot is submitted, so the same card shows in both Your Debates and Submitted Ballots.

- [x] Leave a debate in Your Debates only until this judge submits a ballot
- [x] Keep that debate in Submitted Ballots, with the winner
- [x] Keep Judge a Round when the judge has no open assigned debates

## Summary of Changes

ParentDashboard drops any assigned debate that already has a submitted ballot for this judge, so the card appears only under Submitted Ballots. When every assigned debate is submitted, Judge a Round returns. Verified as Ian (submitted-only) and Jenny (open Your Debates).
