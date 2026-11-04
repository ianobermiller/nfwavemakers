---
# nfw-4sje
title: Make e2e survive load errors and the lessons back link
status: todo
type: bug
priority: high
created_at: 2026-11-04T13:37:09Z
updated_at: 2026-11-04T13:37:09Z
---

Playwright blocks push.

- The lessons admin flow clicks Cancel, but new and edit lesson screens go back with the Lessons back link.
- The student dashboard sometimes renders “Couldn’t load this page.” and the test stops after 5 seconds instead of retrying the load.

## Acceptance criteria

- [ ] Lessons admin e2e leaves the new and edit forms with the back link
- [ ] Ballot screens that hit the load error are retried before the assertion fails
- [ ] `npm run test:e2e` passes on chromium and mobile
