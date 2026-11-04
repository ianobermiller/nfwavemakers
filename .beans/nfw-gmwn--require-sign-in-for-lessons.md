---
# nfw-gmwn
title: Require sign-in for lessons
status: completed
type: feature
priority: high
created_at: 2026-11-04T00:16:39Z
updated_at: 2026-11-04T03:36:06Z
---

Lesson notes are imported as raw HTML into the client bundle, so anyone can read them from the site payload. Members should have to sign in, and the notes should live in PocketBase where API rules can refuse anonymous reads.

Treat the collection as a lightweight CMS: club admins create and edit lessons in the app (title, season year, number, date, markdown body). Speech and Debate section labels are markdown headings (`### Speech: …`, `### Debate: …`). Seed the seven existing lessons once; do not overwrite records that already exist, so later edits stick. Unauthenticated list and view are denied.

## Tasks

- [ ] Add `ballots_lessons` collection; anonymous reads denied, admins write
- [ ] Seed existing lessons as markdown without shipping them in the client bundle
- [ ] Gate `/lessons` on a signed-in member and load notes from PocketBase
- [ ] Let admins create and edit lessons in the app
- [x] Confirm the production build does not contain lesson text

## Summary of Changes

Lessons are no longer in the client bundle. They live in PocketBase `ballots_lessons` (authenticated list/view, admin write) as markdown, rendered after sign-in. Admins manage them under Manage Lessons / `admin-lessons`. The seven existing lessons seed from `ballots/content/lessons` without overwriting edits. Production still needs the migration applied and `ALLOW_REMOTE_LESSON_SEED=1 npm run seed:lessons` once.

`npm run check`, `npm run build`, unit tests, and `e2e/lessons.spec.ts` pass. Browser: gate, index, lesson 1, and admin list verified against local PocketBase.
