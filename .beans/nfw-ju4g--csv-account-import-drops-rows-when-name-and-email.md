---
# nfw-ju4g
title: CSV account import drops rows when name and email are swapped
status: completed
type: bug
priority: high
created_at: 2026-10-23T21:37:20Z
updated_at: 2026-10-23T21:40:43Z
---

Importing a CSV from Manage Users reported rows as ready and then created nothing.

The file had a `name,email,role` header, but the values were email, then name:

    name,email,role
    wells@obermillers.com,Wellington Obermiller,student
    isla@obermillers.com,Isla Obermiller,student

The parser trusts the header, so it treats the person's name as the email. Email validation then rejects every row. The preview still says the rows are ready, because it never checks that the email cell is an email.

Each successful row must create a shared `users` auth record and a `ballots_profiles` row whose `user` relation points at that auth record. Do not change `users` collection rules.

- [x] Swap name and email on a row when the name cell is an email and the email cell is not
- [x] Reject a row whose email is not an email, and show that before Create is clicked
- [x] Preview the name and email that will be created
- [x] Keep creating an auth user and linking the profile to it

## Summary of Changes

CSV account import now fixes reversed name/email columns when the name cell looks like an email and the email cell does not. Rows with a bad email are rejected in the preview before Create, and the dialog lists the name, email, and role that will be created. Create still writes a shared `users` auth record and a linked `ballots_profiles` row; success copy says so. Unit tests cover the swap and invalid-email cases.
