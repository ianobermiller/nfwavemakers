---
# nfw-w5vk
title: Give each ballots page its own tab title
status: completed
type: task
priority: normal
created_at: 2026-11-09T15:20:49Z
updated_at: 2026-11-09T15:30:04Z
---

Every signed-in ballots screen shares one tab title. Each screen should use its own name, in the same "Page — North Florida Wavemakers" form as the club pages.

- [x] Pass a page title through the ballots layout
- [x] Name each ballots screen, including debate and ballot views
- [x] Keep club pages, lessons sign-in, and pending access on their own titles
- [x] Screenshot a few ballots screens with their tab titles

## Summary of Changes

Each ballots screen now sets its own tab title through `PageLayout`. Lists use the page name (Manage Debates, All Ballots, and the By Student / Stranded tabs, Manage Users, Profile, New debate, Edit debate). A debate, ballot, or judge form adds the date and room. Sign-in is "Sign in", profile setup is "Welcome", and pending access stays "Almost there". Club pages and lessons sign-in are unchanged.
