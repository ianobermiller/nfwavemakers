---
# ballots-w4tr
title: 'Prod sign-in emails never send: missing Convex prod env vars'
status: in-progress
type: bug
priority: high
created_at: 2026-09-04T21:45:36Z
updated_at: 2026-09-04T21:50:01Z
---

Sign-in at https://ballots.nfwavemakers.com advances to the "enter code" screen but no magic code email ever arrives, and no error is shown.

## Root cause

`npx convex env list --prod` shows only `SITE_URL` is set on the prod deployment (`neat-hyena-598`). Dev has `SITE_URL`, `AUTH_RESEND_KEY`, `AUTH_EMAIL`, `BETTER_AUTH_SECRET`.

With `AUTH_RESEND_KEY` unset and `SITE_URL` non-local, `sendVerificationCode` in `convex/auth.ts` throws `Missing AUTH_RESEND_KEY`. Better Auth's email-otp route calls `ctx.context.runInBackgroundOrAwait(opts.sendVerificationOTP(...))`, so the throw is swallowed and the endpoint still returns `{"success":true}`. Verified with a direct POST to `/api/auth/email-otp/send-verification-otp` on prod.

`BETTER_AUTH_SECRET` is also unset in prod, so Better Auth falls back to its public default secret — cookies/tokens are forgeable.

The "back to asking for an email" symptom is separate and cosmetic: `verification` is React state in `src/components/Auth.tsx`, so a reload drops the code step.

## Todo

- [x] Set `AUTH_RESEND_KEY` on the prod deployment
- [x] Set `AUTH_EMAIL` on the prod deployment
- [x] Set a fresh `BETTER_AUTH_SECRET` on the prod deployment
- [x] Verify prod now reaches Resend
- [x] Surface send failures instead of swallowing them
- [ ] Ian confirms a real magic code arrives at https://ballots.nfwavemakers.com

## Summary of Changes

Prod deployment `neat-hyena-598` now has `AUTH_RESEND_KEY`, `AUTH_EMAIL`, and a freshly generated `BETTER_AUTH_SECRET` alongside the existing `SITE_URL`. Env changes apply immediately, so sign-in codes send without a redeploy.

Verified by POSTing to prod's `/api/auth/email-otp/send-verification-otp`: the only remaining error is Resend's 422 rejecting the deliberate `example.com` test address, which proves the key authenticates.

`convex/auth.ts` now throws at module load when `SITE_URL` is non-local and `AUTH_RESEND_KEY` or `BETTER_AUTH_SECRET` is unset. Confirmed empirically that a module-level throw fails `convex deploy` with a readable message rather than deploying a silently broken backend.

Not done (declined): persisting the login step across reloads, and a README prod env checklist.
