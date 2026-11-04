---
# nfw-xgxs
title: One screen for sign-in and sign-up
status: completed
type: feature
priority: normal
created_at: 2026-11-04T03:59:33Z
updated_at: 2026-11-04T14:03:52Z
---

A new account and a return visit share one screen: an email address, then a code. Password and passkey stay as links under that action. After a successful sign-in, offer to save a passkey without blocking access.

- [x] Replace the sign-in and sign-up tabs with one email form
- [x] Email me a code creates an account when the address is new
- [x] Use a password reveals password sign-in
- [x] Offer a dismissible passkey after sign-in
- [x] Update end-to-end sign-in

## Summary of Changes

Sign-in and sign-up are one screen: email, **Email me a code**, and text links for password and passkey. A new address gets a passwordless account before the code is sent. After a password or email-code sign-in, a dismissible dialog offers to save a passkey; the offer is skipped for passkey sign-in and for restored sessions. E2E helpers use the password link.
