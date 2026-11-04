---
# nfw-kcon
title: Lock club role after signup
status: completed
type: bug
priority: high
created_at: 2026-11-04T14:46:46Z
updated_at: 2026-11-04T14:55:15Z
---

Selecting a role on Edit Profile overwrote an admin account. Admin is not one of the signup choices, so nothing looked selected, and saving Parent / Judge replaced the admin role.

People may choose Student or Parent / Judge when they sign up. After that, only an admin can change someone else's role. An admin cannot change their own role from Edit Profile. On the pending Approval list, the role is prominent so the admin can correct a wrong choice before admitting the person.

- [x] Edit Profile shows the current role and does not send a role change
- [x] PocketBase allows a self-service role only while the profile has none, and only student or parent
- [x] An admin cannot change their own role; they can change other accounts
- [x] Pending Approval shows a prominent role control, and approved accounts stay editable by an admin

## Summary of Changes

Edit Profile shows the club role as read-only text. Students can still change Speech / TP / LD; the role is not sent. Signup still chooses Student or Parent / Judge. PocketBase allows a self-service role only while the profile has none, and an admin cannot change their own role. A later migration keeps that lock after the category rule. Manage Users shows a Role select on every other account, with a labeled control and Approval button on the Pending tab. Approval still sets role and category together.
