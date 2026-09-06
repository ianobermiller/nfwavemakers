---
# ballots-g606
title: Migrate production Convex data to PocketBase
status: scrapped
type: task
priority: high
created_at: 2026-09-06T04:23:14Z
updated_at: 2026-09-06T12:08:27Z
parent: ballots-y84i
---

Export production users, debates, participants, ballots, speaker evaluations, and avatars from Convex and import them into PocketBase with relation and legacy-ID mapping. Authentication credentials cannot be transferred; users should retain email access via OTP or reset their password.

Blocked until the PocketBase schema is installed and deployment/superuser access is available.

- [ ] Export production Convex records and avatar blobs
- [ ] Import PocketBase users with legacy Convex ID mapping
- [ ] Import debates, ballots, and speaker evaluations with rewritten relations
- [ ] Upload avatars and verify record counts
- [ ] Decide whether legacy ballot/debate URLs require redirects
- [ ] Verify representative admin, judge, and student records


Scrapped: there is no production Convex data to migrate.
