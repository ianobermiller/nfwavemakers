---
# ballots-za7m
title: Use zod for parsing
status: completed
type: task
priority: normal
created_at: 2026-09-04T15:17:16Z
updated_at: 2026-09-04T15:27:52Z
---

Adopt a schema library for runtime parsing/validation across the codebase.

Originally filed as "use valibot"; resolved with **zod** instead, at the user's direction, to reuse the version already in the dependency tree rather than add a new package.

## Scope

Convex validators (`convex/schema.ts`, `convex/lib/validators.ts`, and all `args`/`returns` in `convex/*.ts`) cannot move to a third-party schema library — Convex requires its own `v` from `convex/values`. Zod is therefore scoped to parsing untrusted data at boundaries Convex does not own.

In scope:

- [x] Declare the already-installed `zod@4.4.3` as a direct dependency (reused instead of adding valibot; it is already hoisted and deduped via better-auth, so nothing new enters the tree — declaring it is required because knip errors on unlisted imports)
- [x] `src/components/ProfileEdit.tsx` — parse the avatar upload response
- [x] `e2e/global-setup.ts` — parse the e2e seed subprocess output
- [x] `npm run check` passes

Out of scope (decided): env var validation, `scripts/migrate-from-instant.mjs`, Convex validators.


## Summary of Changes

Adopted **zod** rather than valibot, reusing the copy already present in the tree.

- `package.json` — declared `zod: ^4.4.3` as a direct dependency. It was already installed, hoisted to top-level `node_modules`, and deduped across `better-auth`, `@convex-dev/better-auth`, `convex-helpers`, and `knip`, so no package was added: `npm install` reported "up to date" and the lockfile diff is only the two-line root declaration. Declaring it is required because knip errors on unlisted imports (and importing a transitive dep would break silently if better-auth ever drops or bumps zod).
- `src/components/ProfileEdit.tsx` — replaced 9 lines of hand-rolled `typeof`/`in` narrowing of the avatar upload response with `uploadResponseSchema`.
- `e2e/global-setup.ts` — replaced 20 lines of narrowing plus a manual 4-field pick of the seed subprocess output with `seedResultSchema`.

Used `safeParse` at both sites rather than `parse`, deliberately: `ProfileEdit` surfaces `e.message` to the user, and a thrown `ZodError` message is a JSON blob. `safeParse` preserves the existing "Invalid upload response" / "e2e seed returned invalid JSON" messages.

## Verification

- `npm run check` (types + lint + knip) passes.
- Confirmed `seedResultSchema` matches the actual `e2eSeed:seed` return shape; its four fields are present as strings and zod strips the extra keys (`adminEmail`, `debateCount`, `studentCount`, `submittedBallotCount`), which is the same result as the previous explicit pick.
- Exercised both schemas against 10 accept/reject cases (valid, extra keys, missing field, wrong type, `null`, array) — all behaved as expected.
- `npm run test:e2e` was **not** used as a signal: it was already failing before this change (`signIn` times out because Resend rejects `example.com` addresses), and no `convex dev` deployment was reachable. Nothing in this change affects that failure, but it does mean the e2e path is unverified end to end.

## Notes

Convex validators were left alone, as scoped: Convex requires its own `v` from `convex/values` for schema and function `args`/`returns`, so `convex/schema.ts`, `convex/lib/validators.ts`, and `convex/importInstant.ts` cannot move to zod. Backend validation stays with Convex; zod covers only the client/node boundaries Convex does not own.

Deferred (out of scope, no beans filed): env var validation in `src/db.ts` / `src/authClient.ts` / `parseEnv` in `e2e/global-setup.ts`, and `scripts/migrate-from-instant.mjs` (one-off InstantDB migration, already completed in 2f58772). Also note `judgeEmail`/`studentEmail` are validated as plain strings to preserve existing behavior; `z.email()` would be stricter if wanted.
