---
# nfw-sbxe
title: Admins can create accounts from a CSV
status: todo
type: feature
created_at: 2026-10-23T21:01:06Z
updated_at: 2026-10-23T21:01:06Z
---

Admins need ballots profiles for students, parents, and other admins before those people have signed up, so they can assign them to debates.

On Manage Users, an admin can create one account or many from a CSV of names and emails. Role defaults to student. The admin can choose parent or admin instead, and a CSV role column overrides that default per row.

Each new person gets an auth account and a ballots profile immediately, and shows up in assignment pickers. They sign in later with an email code. Creating an account does not send email. An address that already has an account is reported and skipped; the rest of the batch still goes through.

The shared users collection only lets someone view their own record, so the profile stores the email the admin entered. Do not change users collection rules.

- [ ] Let admins create ballots profiles for other people, with role student, parent, or admin
- [ ] Store the entered email on the profile so it shows in Manage Users
- [ ] Add a Manage Users tool for one account or a CSV of names and emails
- [ ] Default the role to student, and let an admin choose parent or admin
- [ ] Report invalid rows and emails that already exist without failing the rest of the batch
