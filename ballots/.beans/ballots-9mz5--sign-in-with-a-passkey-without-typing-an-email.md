---
# ballots-9mz5
title: Sign in with a passkey without typing an email
status: completed
type: feature
priority: normal
created_at: 2026-09-06T22:54:36Z
updated_at: 2026-09-06T22:56:54Z
---

The passkey button on the sign-in screen was disabled until an email was entered, because /api/passkey/login/begin identified the user before building allowCredentials.

Switch to client-side discoverable credentials so the authenticator picks the passkey:
- [x] Register with residentKey preferred so new passkeys are discoverable
- [x] Server: BeginDiscoverableLogin when no identifier is sent, sessions keyed by challenge
- [x] Server: ValidateDiscoverableLogin resolving the user from the userHandle
- [x] Client: email optional in signInWithPasskey, button no longer disabled
- [x] Client: conditional UI so passkeys show up in the email field autofill
- [x] Deploy the server and verify against pb.obermillers.com
- [x] Cover the emailless flow in the e2e test

Keeps the email-identified path as a fallback for authenticators that cannot store a discoverable credential.

## Summary of Changes

Server (obermillers.com, deployed): `/api/passkey/login/begin` starts a
discoverable ceremony when the request carries no email or user id, storing the
session under the challenge since no user is known yet. The finish step parses
the assertion, looks the session up by challenge, and resolves the user from the
authenticator's user handle, which is already the PocketBase record id.
Registration now asks for a preferred resident key.

Client: `signInWithPasskey` takes an optional email, the sign-in button is no
longer disabled on an empty field, and the email input carries the `webauthn`
autocomplete token with a conditional-mediation request on mount so saved
passkeys appear in autofill. Clicking the button aborts that request and waits
for the browser to release it, otherwise the modal request is rejected as
already pending.

Verified against a local build with a virtual authenticator: registration
produces a resident credential, autofill signs in with no interaction, the
button signs in with an empty email field, and the email-identified path still
works. Also fixed disabled-button styling app-wide (`enabled:hover:` plus
`disabled:cursor-not-allowed`) so disabled buttons stop showing hover states.
