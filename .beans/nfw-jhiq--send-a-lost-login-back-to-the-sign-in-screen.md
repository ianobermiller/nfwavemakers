---
# nfw-jhiq
title: Send a lost login back to the sign-in screen
status: completed
type: bug
priority: high
created_at: 2026-11-07T11:52:32Z
updated_at: 2026-11-07T12:17:15Z
---

Logging out in another tab, or losing the saved login any other way, leaves member pages up with empty lists. The login screen should replace that page.

A PocketBase list with no login returns an empty 200, and the live cache publishes it. The React profile can also stay set when the storage event is missed or an in-flight profile load finishes after the token is gone. A rejected token (401) is only cleared on session refresh, so other requests keep the page in place.

- [x] Do not apply a profile load that finishes after the login is gone
- [x] Do not publish live query results once the saved login is invalid
- [x] Clear the saved login when a request is rejected with 401 for that same token
- [x] Re-check the saved login when the tab is shown again
- [x] Member routes show the sign-in screen whenever the saved login is gone

## Summary of Changes

Losing the saved login now clears the member profile and live query cache right away, so empty PocketBase list results cannot blank the page. A 401 for the same token ends the session on any request, and showing the tab again re-checks the login. Member routes then render the sign-in screen (or redirect nested ballot routes to it).

## Follow-up

- [x] Keep a judge's in-progress ballot in local storage when the login is invalidated

A judge's in-progress ballot is already written to local storage on each edit (`ballots:draft:v1:<judge>:<debate>`). Dropping the login leaves that draft in place and returns to sign-in. Signing back in reloads the reason for decision and speaker notes onto the form; the server sync can fail, and the form says the notes are safe on this device.
