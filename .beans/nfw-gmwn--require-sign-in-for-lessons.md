---
# nfw-gmwn
title: Require sign-in for lessons
status: todo
type: feature
priority: high
created_at: 2026-11-04T00:16:39Z
updated_at: 2026-11-04T00:16:44Z
---

Lesson notes are imported as raw HTML into the client bundle, so anyone can read them from the site payload. Members should have to sign in, and the notes should live in PocketBase where API rules can refuse anonymous reads.

Treat the collection as a lightweight CMS: club admins create and edit lessons in the app (title, season year, number, date, markdown body). Speech and Debate section labels are markdown headings (`### Speech: …`, `### Debate: …`). Seed the seven existing lessons once; do not overwrite records that already exist, so later edits stick. Unauthenticated list and view are denied.

## Tasks

- [ ] Add `ballots_lessons` collection; anonymous reads denied, admins write
- [ ] Seed existing lessons as markdown without shipping them in the client bundle
- [ ] Gate `/lessons` on a signed-in member and load notes from PocketBase
- [ ] Let admins create and edit lessons in the app
- [ ] Confirm the production build does not contain lesson text
