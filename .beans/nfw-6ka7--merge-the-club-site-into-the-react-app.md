---
# nfw-6ka7
title: Merge the club site into the React app
status: todo
type: feature
priority: high
created_at: 2026-10-24T00:53:32Z
updated_at: 2026-10-24T00:53:32Z
---

The club brochure and the ballots app are two sites, and the brochure copies the same header, nav, and footer into every lesson page. Fold the brochure into the ballots React app so one site serves both, with a single shared layout.

Deploy the merged app at nfwavemakers.com. Redirect ballots.nfwavemakers.com to that site. Lessons stay public.

- [ ] Render the home page and lessons from one React layout
- [ ] Keep ballots routes behind sign-in; leave lessons public
- [ ] Build one site for nfwavemakers.com, including the www redirect
- [ ] Redirect ballots.nfwavemakers.com to the merged site
