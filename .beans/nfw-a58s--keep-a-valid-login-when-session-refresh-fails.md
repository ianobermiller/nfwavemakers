---
# nfw-a58s
title: Keep a valid login when session refresh fails
status: completed
type: bug
priority: critical
created_at: 2026-11-04T15:13:21Z
updated_at: 2026-11-04T15:30:19Z
---

A page load refreshes the PocketBase login, and any failure deletes the saved session. Last night that signed a judge out during a round, so later ballot saves went out with no login.

A refresh should extend the session. Only a rejected token (401) should sign the user out, and a newer token from a parallel refresh must survive.

- [x] Share one in-flight refresh across callers
- [x] Sign out only when this token is rejected with 401
- [x] Leave the session in place on network, abort, and server errors
- [x] Cover that decision with a unit test

## Summary of Changes

Page load and the pending-access check now share one session refresh. A failure deletes the saved login only when the server rejects that same token with 401. A newer token, a dropped request, or a server error leaves the judge signed in, so ballot saves keep their login. Unit tests cover that decision.
