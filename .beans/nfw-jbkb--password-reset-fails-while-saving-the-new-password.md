---
# nfw-jbkb
title: Password reset fails while saving the new password
status: completed
type: bug
priority: high
created_at: 2026-11-07T11:46:33Z
updated_at: 2026-11-07T11:52:28Z
---

Resetting a password on nfwavemakers.com shows PocketBase's "An error occurred while validating the submitted data."

The confirm-password-reset request saves the new password, then a pb_hook throws `ReferenceError: passwordHashChanged is not defined`. PocketBase runs hook handlers in a separate VM, so helpers declared at the top of a `.pb.js` file are not in scope. The thrown error is returned after the write, which also rotates the auth token, so the reset link is dead on retry.

The same pattern breaks `syncProfileEmailVerified` on user updates and OTP sign-in.

## Tasks
- [x] Keep profile flag updates inside the handler scope
- [x] Mark password_set only when a person submits a plain password
- [x] Stop a profile-flag failure from failing the password save
- [x] Deploy the hooks

## Summary of Changes

Password reset and other user saves no longer call helpers that exist only in the hook file's loader. Those helpers now live in `ballots_profile_flags.js` and are `require`d inside each handler, which is the VM that actually runs. A missing profile or a failed flag write is logged and does not fail the password save. `password_set` is recorded only when the save includes a plain password the person typed.

Verified locally: changing a password returns 200, the new password signs in, and a linked profile gets `password_set`. Deployed to pb.obermillers.com and the process is healthy.
