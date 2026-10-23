---
# nfw-vx7c
title: Link a profile when the sign-in account already exists
status: todo
type: bug
priority: high
created_at: 2026-10-23T21:52:15Z
updated_at: 2026-10-23T21:52:15Z
---

CSV account create returns 400 validation_not_unique when the email already has a shared `users` auth record but no `ballots_profiles` row. The import stops and the person never shows up in Manage Users.

The shared `users` list/view rules only allow someone to read their own record, so the admin client cannot look up that auth id. Do not change `users` collection rules.

When the email is already registered, an admin-only server route should create the `ballots_profiles` row with `user` set to the existing auth record. New emails still get an auth user plus a profile. Nothing is emailed.

- [ ] Add an admin-only route that links a profile to an existing auth user by email
- [ ] Use that route from account create when the email is already registered
- [ ] Deploy the route and attach profiles for the accounts that failed import
