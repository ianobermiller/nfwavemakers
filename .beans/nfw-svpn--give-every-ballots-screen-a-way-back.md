---
# nfw-svpn
title: Give every ballots screen a way back
status: completed
type: feature
priority: normal
created_at: 2026-11-04T04:01:54Z
updated_at: 2026-11-04T04:09:09Z
---

The ballots home greets the signed-in person by name, and leaving that home for another ballots screen strands you there. Only the ballot you fill out for a debate has a link back.

- [ ] Remove the "Hello, name" heading from the ballots home
- [ ] Add a back link on every other ballots screen
- [ ] Send that link to the page the person just left, or to the parent screen when the URL was opened directly
- [x] Verify the home, an admin screen, a nested form, a ballot, and profile in the browser

## Summary of Changes

Removed the ballots home greeting. Every other ballots screen now has a back link that returns through in-app history, or to its parent screen when the URL was opened directly.
