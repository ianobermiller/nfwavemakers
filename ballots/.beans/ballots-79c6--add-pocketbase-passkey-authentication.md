---
# ballots-79c6
title: Add PocketBase passkey authentication
status: in-progress
type: feature
priority: normal
created_at: 2026-09-06T12:18:41Z
updated_at: 2026-09-06T12:23:39Z
---

Add WebAuthn registration and login against the existing PocketBase passkey endpoints without server changes.

- [x] Implement a thin passkey client with base64url conversion and PocketBase auth-store integration
- [x] Add passkey registration for authenticated users
- [x] Add passkey sign-in while preserving existing auth flows
- [x] Add automated coverage for encoding and request/auth behavior
- [ ] Verify lint, types, tests, build, and browser flows

## Verification

`npm run check`, `npm run build`, and Playwright test compilation pass. The local login UI was verified in Chromium. The live passkey e2e flow is implemented with a virtual authenticator but could not run because no PocketBase test superuser credentials are configured and the documented test login is not present on the live server.
