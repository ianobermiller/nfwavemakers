---
# ballots-8lle
title: Switching tabs wipes the sign-in form
status: in-progress
type: bug
priority: high
created_at: 2026-09-04T22:52:10Z
updated_at: 2026-09-04T22:52:10Z
---

On prod, typing an email on the sign-in screen and then switching to another tab and back clears the field. It looks like a page reload but is actually a React remount.

## Root cause

Better Auth's client enables `refetchOnWindowFocus` by default. `focus-manager.mjs` listens for `visibilitychange` and `session-refresh.mjs` refetches the session (rate-limited to once per 5s).

During that refetch `useSession().isPending` is true. `@convex-dev/better-auth`'s provider computes `isLoading: isSessionPending && !cachedToken` — and a signed-out visitor has no cached token, so `useConvexAuth().isLoading` flips true. `AuthSession` mapped that to `loading`, and `AppShell` swaps the tree for its "Loading…" gate, unmounting `<Auth />` and destroying its `email` / `code` / `verification` / `mode` state.

Signed-in users are unaffected because `cachedToken` is set, which keeps `isLoading` false.

This is also the real explanation for the earlier "coming back to the login screen asks for an email again" report — the OTP step was being lost to the same remount, not to a manual reload.

## Fix

`AuthSession` now holds the last settled auth state while a revalidation is in flight, so only the very first resolve shows the loading screen.

Verified A/B against local dev with a Playwright script that dispatches the same `visibilitychange` event a tab switch produces:
- without the fix: loading screen appears once, email field ends up empty
- with the fix: no loading screen, email preserved

## Todo

- [x] Reproduce with an automated script
- [x] Hold last settled auth state instead of re-showing the loading gate
- [x] Confirm A/B and that `npm run check` passes
- [ ] Deploy the frontend to Cloudflare Pages so prod picks it up
