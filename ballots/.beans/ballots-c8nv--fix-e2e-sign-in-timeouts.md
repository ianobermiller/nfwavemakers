---
# ballots-c8nv
title: Fix e2e sign-in timeouts
status: completed
type: bug
priority: high
created_at: 2026-09-04T15:30:30Z
updated_at: 2026-09-04T15:45:21Z
---

## What to build

Playwright e2e tests time out during magic-code sign-in (OTP + Resend + wrong button text). Switch authenticated e2e flows to password sign-in using the existing local test-account password.

## Acceptance criteria

- [x] E2E `signIn` uses the password form (not magic code / OTP)
- [x] Global setup provisions password-enabled judge and student accounts
- [x] Judge and student flows that require auth complete without the 30s test timeout
- [x] `npm run test:e2e` no longer fails on sign-in locator timeouts

## Blocked by

None - can start immediately

## Summary of Changes

Authenticated Playwright flows now sign in with the password form instead of magic-code OTP.

- `e2e/ballot.spec.ts` — `signIn` clicks **Use a password**, fills `#password`, and submits **Sign In** (`exact: true` so it does not hit the passkey button).
- `e2e/global-setup.ts` — runs `scripts/seed-test-accounts.mjs` so judge/student Better Auth accounts exist with `test-password`, then exposes `E2E_PASSWORD`.
- `scripts/seed-test-accounts.mjs` — prints the seed JSON Playwright needs (`ballotId`, `debateId`, emails).

`npm run test:e2e`: 16 passed (chromium + mobile).
