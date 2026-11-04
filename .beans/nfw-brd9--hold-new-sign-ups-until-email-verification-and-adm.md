---
# nfw-brd9
title: Hold new sign-ups until email verification and admin approval
status: completed
type: feature
priority: high
created_at: 2026-11-04T00:25:18Z
updated_at: 2026-11-04T00:30:03Z
---

New self-signups stay pending until both gates pass: the person verifies their email, and a club admin takes the Approval action. Existing accounts are already approved and keep access.

- [x] Existing profiles are marked approved (and already email-verified) so current members are not locked out
- [x] Self-signup profiles start unapproved and unverified; the person cannot set those flags
- [x] PocketBase rules hide ballots data until both flags are set
- [x] A signed-in person who is still pending sees what is left, and can resend the verification email
- [x] Manage Users lists people waiting, and the admin action is labeled Approval
- [x] Accounts an admin creates are approved, since the admin is admitting them

## Summary of Changes

Self-signups start with `approved` and `email_verified` false on `ballots_profiles`. Existing profiles are backfilled to both true when the schema is applied. PocketBase rules keep ballots data behind both flags. Pending people see a status screen (resend verification email); Manage Users has a Pending tab and an **Approval** action. Admin-created and linked profiles are admitted immediately.
