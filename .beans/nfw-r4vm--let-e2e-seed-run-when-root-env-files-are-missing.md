---
# nfw-r4vm
title: Let e2e seed run when root env files are missing
status: completed
type: bug
priority: high
created_at: 2026-10-24T12:44:56Z
updated_at: 2026-10-24T12:46:46Z
---

`npm run check:push` fails before seeding because `node --env-file=.env --env-file=.env.local` errors when those files are absent. Playwright already injects the throwaway PocketBase URL and superuser credentials; the env files are optional local overrides.

## Tasks
- [x] Use `--env-file-if-exists` for the e2e seed and `seed:test`
- [x] Confirm `npm run check:push` passes

## Notes

`check:push` also failed the mobile home-page test: club links sit behind the navigation toggle below the `md` breakpoint. The test opens that toggle when it is visible.

## Summary of Changes

- Seed scripts use `--env-file-if-exists`, so a missing root `.env` / `.env.local` no longer aborts `check:push`. Playwright still supplies the throwaway PocketBase URL and superuser credentials.
- The home-page e2e opens the mobile navigation toggle before asserting club links.
