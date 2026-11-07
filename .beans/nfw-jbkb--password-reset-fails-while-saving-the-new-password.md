---
# nfw-jbkb
title: Password reset fails while saving the new password
status: todo
type: bug
priority: high
created_at: 2026-11-07T11:46:33Z
updated_at: 2026-11-07T11:46:33Z
---

Resetting a password on nfwavemakers.com shows PocketBase's "An error occurred while validating the submitted data."

The confirm-password-reset request saves the new password, then a pb_hook throws `ReferenceError: passwordHashChanged is not defined`. PocketBase runs hook handlers in a separate VM, so helpers declared at the top of a `.pb.js` file are not in scope. The thrown error is returned after the write, which also rotates the auth token, so the reset link is dead on retry.

The same pattern breaks `syncProfileEmailVerified` on user updates and OTP sign-in.

## Tasks
- [ ] Keep profile flag updates inside the handler scope
- [ ] Mark password_set only when a person submits a plain password
- [ ] Stop a profile-flag failure from failing the password save
- [ ] Deploy the hooks
