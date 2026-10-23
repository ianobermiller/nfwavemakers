---
# nfw-97s0
title: Standard sign-in and sign-up with passwords
status: completed
type: feature
priority: normal
created_at: 2026-10-23T21:06:40Z
updated_at: 2026-10-23T21:12:36Z
---

The sign-in screen defaults to an email code and hides password sign-up behind extra links. Replace it with a standard Sign in / Sign up flow, and let people add or change a password from profile settings.

- [x] Sign in leads with email and password; email code and passkey stay available
- [x] Sign up collects email, password, and confirmation
- [x] Profile settings can add a password or change an existing one
- [x] E2E sign-in uses the new form

## Summary of Changes

Auth screen now leads with Sign in / Sign up tabs. Sign in is email + password, with email code and passkey as alternatives. Sign up asks for email, password, and confirmation.

Profile settings include a Password section to change the current password, or email a reset link for accounts that only signed in with a code. PocketBase field validation errors surface in the UI. E2E sign-in uses the password form on landing.
