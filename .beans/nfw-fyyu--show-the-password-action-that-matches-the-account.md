---
# nfw-fyyu
title: Show the password action that matches the account
status: completed
type: bug
priority: normal
created_at: 2026-11-04T14:58:37Z
updated_at: 2026-11-04T15:04:49Z
---

Profile settings always show a change-password form and an email-a-link button together. Code sign-up stores a random password the person never sees, so that hedge is the wrong screen for both kinds of account.

- [x] Record on the profile when the person has chosen a password
- [x] Password settings show the change form or the email link
- [x] Check both states in the browser

## Summary of Changes

Profile settings pick one password path from `ballots_profiles.password_set`. Code-only accounts see the email-a-link button; accounts that have chosen a password see the change form. PocketBase hooks set the flag when the auth password hash changes or on password sign-in. Schema and hooks are live on production PocketBase.
