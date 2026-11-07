---
# nfw-jhiq
title: Send a lost login back to the sign-in screen
status: todo
type: bug
priority: high
created_at: 2026-11-07T11:52:32Z
updated_at: 2026-11-07T11:52:32Z
---

Logging out in another tab, or losing the saved login any other way, leaves member pages up with empty lists. The login screen should replace that page.

A PocketBase list with no login returns an empty 200, and the live cache publishes it. The React profile can also stay set when the storage event is missed or an in-flight profile load finishes after the token is gone. A rejected token (401) is only cleared on session refresh, so other requests keep the page in place.

- [ ] Do not apply a profile load that finishes after the login is gone
- [ ] Do not publish live query results once the saved login is invalid
- [ ] Clear the saved login when a request is rejected with 401 for that same token
- [ ] Re-check the saved login when the tab is shown again
- [ ] Member routes show the sign-in screen whenever the saved login is gone
