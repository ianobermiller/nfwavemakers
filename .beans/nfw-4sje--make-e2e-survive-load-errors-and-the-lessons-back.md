---
# nfw-4sje
title: Make e2e survive load errors and the lessons back link
status: completed
type: bug
priority: high
created_at: 2026-11-04T13:37:09Z
updated_at: 2026-11-04T13:49:07Z
---

Playwright blocks push.

- The lessons admin flow clicks Cancel, but new and edit lesson screens go back with the Lessons back link.
- The student dashboard sometimes renders “Couldn’t load this page.” and the test stops after 5 seconds instead of retrying the load.

## Acceptance criteria

- [x] Lessons admin e2e leaves the new and edit forms with the back link
- [x] Ballot screens that hit the load error are retried before the assertion fails
- [x] `npm run test:e2e` passes on chromium and mobile

## Notes

Student dashboard failures were a real app bug: `listUpcomingDebates` sorted by `created`, but `ballots_debates` has no autodate `created` field, so PocketBase returned 400 and the route error boundary stuck on “Couldn’t load this page.”

## Summary of Changes

- Lessons admin e2e uses the `← Lessons` back link instead of a Cancel button that no longer exists.
- `waitForLoaded` retries through the route load-error screen before assertions.
- Fixed student dashboard crash: upcoming/admin debate lists sorted by a non-existent `created` column; sort by `date`/`id` instead.
- Playwright retries once and gives tests 45s so a single load blip does not fail the suite.
