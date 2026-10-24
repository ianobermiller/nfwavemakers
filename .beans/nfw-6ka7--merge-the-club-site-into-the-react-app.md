---
# nfw-6ka7
title: Merge the club site into the React app
status: completed
type: feature
priority: high
created_at: 2026-10-24T00:53:32Z
updated_at: 2026-10-24T12:39:51Z
---

The club brochure and the ballots app are two sites, and the brochure copies the same header, nav, and footer into every lesson page. Fold the brochure into the ballots React app so one site serves both, with a single shared layout.

Deploy the merged app at nfwavemakers.com. Redirect ballots.nfwavemakers.com to that site. Lessons stay public.

- [x] Render the home page and lessons from one React layout
- [x] Keep ballots routes behind sign-in; leave lessons public
- [x] Build one site for nfwavemakers.com, including the www redirect
- [x] Redirect ballots.nfwavemakers.com to the merged site

## Notes

The React app is the repo root. Club pages are in `src/`. Ballot screens, hooks, and data stay in `ballots/` with PocketBase. Club images stay in `images/` and are not copied into `ballots/`.

## Notes

Rebased onto main so the schedule uses the updated Tuesday times and 2026–27 tournament list. Schedule is its own page. Join Us is hidden while signed in. Ballot screens use the site layout through `@/`, and scoring helpers live in `ballots/utils/`.

## Summary of Changes

The club site and the ballots app are one React app at the repo root. Club pages live in `src/`. Ballot screens, hooks, and data stay in `ballots/` with PocketBase. Lessons stay public, and the schedule is its own page. Join Us is hidden while signed in. `npm run build` writes `_site/` plus a worker that redirects www and ballots.nfwavemakers.com to nfwavemakers.com.
