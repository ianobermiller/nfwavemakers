---
# ballots-uk31
title: Mark debate partners
status: completed
type: feature
priority: normal
created_at: 2026-10-24T00:56:17Z
updated_at: 2026-10-24T01:30:44Z
parent: ballots-an32
---

Admins need to record each student's regular debate partner. Setting up a debate should fill that partner into the open seat on the same team, so a round does not always mean picking all four speakers.

- [x] Add a partner relation on student profiles
- [x] Let admins set and clear a debate partner from Manage Users
- [x] When a speaker is chosen on a debate, fill their partner into the open seat on that team
- [x] Leave an occupied seat as the admin set it

Acceptance:
- A student has at most one partner, and the link is mutual.
- Choosing one speaker on an empty team fills the other seat with their partner.
- Admins can still assign a different teammate for a round.

## Summary of Changes

Student profiles can store one regular debate partner, and the link is kept mutual. Admins set or clear it from Manage Users with the same searchable student picker used when setting up a debate, limited to other students. Choosing a speaker fills that partner into the open seat on the same team. Changing either speaker, including the auto-filled partner, keeps the person you picked.
