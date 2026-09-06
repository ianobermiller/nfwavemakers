---
# ballots-ph8a
title: Passkey registration fails with Parse error for Registration
status: completed
type: bug
priority: high
created_at: 2026-09-06T21:17:13Z
updated_at: 2026-09-06T22:06:25Z
---

Registering a passkey returned "Parse error for Registration" from POST /api/passkey/register/finish.

## Root cause (server side, not the client payload)

PocketBase v0.40 wraps every request body in `router.RereadableReadCloser`, which **rewinds itself on io.EOF** so the body can be read again.

go-webauthn v0.16 `protocol.decodeBody` decodes the JSON value and then calls `decoder.Token()`, requiring `io.EOF`. Because the body rewound, the next read replays the body from the start, so the decoder sees another `{` and returns "body contains trailing data". go-webauthn reports that as `Details: "Parse error for Registration"` with the real reason in the discarded `Info` field.

`loginBegin`/`loginFinish` were unaffected because they already do `io.ReadAll` + `io.NopCloser(bytes.NewReader(...))`, which yields a clean EOF. `registerFinish` passed `e.Request` straight to `FinishRegistration`.

## Resolution

`registerFinish` now reads and restores the body, matching the login handlers. Fixed in obermillers.com@51ee7e6 and deployed to pb.obermillers.com by the PocketBase workflow.

Verified against the live server with a Chrome virtual authenticator: register/finish returns 200 and login/finish returns a token, driving the real `src/data/passkeys.ts` module in the running app.

- [x] Reproduce against the live server and capture the exact rejected payload
- [x] Identify root cause
- [x] Apply the server fix and redeploy
- [x] Verify registration succeeds and sign-in still works
