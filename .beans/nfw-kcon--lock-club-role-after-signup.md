---
# nfw-kcon
title: Lock club role after signup
status: todo
type: bug
priority: high
created_at: 2026-11-04T14:46:46Z
updated_at: 2026-11-04T14:46:46Z
---

Selecting a role on Edit Profile overwrote an admin account. Admin is not one of the signup choices, so nothing looked selected, and saving Parent / Judge replaced the admin role.

People may choose Student or Parent / Judge when they sign up. After that, only an admin can change someone else's role. An admin cannot change their own role from Edit Profile. On the pending Approval list, the role is prominent so the admin can correct a wrong choice before admitting the person.

- [ ] Edit Profile shows the current role and does not send a role change
- [ ] PocketBase allows a self-service role only while the profile has none, and only student or parent
- [ ] An admin cannot change their own role; they can change other accounts
- [ ] Pending Approval shows a prominent role control, and approved accounts stay editable by an admin
