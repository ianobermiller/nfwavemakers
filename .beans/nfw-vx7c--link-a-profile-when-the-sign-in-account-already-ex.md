---
# nfw-vx7c
title: Link a profile when the sign-in account already exists
status: completed
type: bug
priority: high
created_at: 2026-10-23T21:52:15Z
updated_at: 2026-10-23T22:19:26Z
---

CSV account create returns 400 validation_not_unique when the email already has a shared `users` auth record but no `ballots_profiles` row. The import stops and the person never shows up in Manage Users.

The shared `users` list/view rules only allow someone to read their own record, so the admin client cannot look up that auth id. Do not change `users` collection rules.

When the email is already registered, an admin-only server route should create the `ballots_profiles` row with `user` set to the existing auth record. New emails still get an auth user plus a profile. Nothing is emailed.

- [x] Add an admin-only route that links a profile to an existing auth user by email
- [x] Use that route from account create when the email is already registered
- [x] Deploy the route and attach profiles for the accounts that failed import

## Summary of Changes

When account create hits a shared `users` email that already exists, the app calls `POST /api/ballots/link-profile`. That hook checks the caller is a ballots admin, finds the auth record by email, and creates a `ballots_profiles` row with `user` set to it. `users` collection rules are unchanged.

The running PocketBase binary did not load `pb_hooks`, so the custom binary now registers the JSVM plugin (migrations dir left empty so already-applied JS migrations are not evaluated again). Wellington and Isla now have student profiles linked to their existing auth users.
