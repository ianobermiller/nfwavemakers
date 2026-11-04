---
# nfw-brd9
title: Hold new sign-ups until email verification and admin approval
status: todo
type: feature
priority: high
created_at: 2026-11-04T00:25:18Z
updated_at: 2026-11-04T00:25:18Z
---

New self-signups stay pending until both gates pass: the person verifies their email, and a club admin takes the Approval action. Existing accounts are already approved and keep access.

- [ ] Existing profiles are marked approved (and already email-verified) so current members are not locked out
- [ ] Self-signup profiles start unapproved and unverified; the person cannot set those flags
- [ ] PocketBase rules hide ballots data until both flags are set
- [ ] A signed-in person who is still pending sees what is left, and can resend the verification email
- [ ] Manage Users lists people waiting, and the admin action is labeled Approval
- [ ] Accounts an admin creates are approved, since the admin is admitting them
