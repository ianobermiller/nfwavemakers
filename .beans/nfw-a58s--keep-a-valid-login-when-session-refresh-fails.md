---
# nfw-a58s
title: Keep a valid login when session refresh fails
status: todo
type: bug
priority: critical
created_at: 2026-11-04T15:13:21Z
updated_at: 2026-11-04T15:13:21Z
---

A page load refreshes the PocketBase login, and any failure deletes the saved session. Last night that signed a judge out during a round, so later ballot saves went out with no login.

A refresh should extend the session. Only a rejected token (401) should sign the user out, and a newer token from a parallel refresh must survive.

- [ ] Share one in-flight refresh across callers
- [ ] Sign out only when this token is rejected with 401
- [ ] Leave the session in place on network, abort, and server errors
- [ ] Cover that decision with a unit test
