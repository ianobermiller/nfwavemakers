---
# nfw-3xfo
title: Replace resolution with a case field
status: completed
type: feature
priority: normal
created_at: 2026-11-04T15:32:55Z
updated_at: 2026-11-04T16:24:31Z
---

Debates still store and show a resolution, which stays the same all year. Each round needs the affirmative case instead — for example, "Block arms sales to Turkey" from this year's resolution.

- [ ] Rename the stored resolution to case
- [ ] Add a Case field on the debate form, with that example as the placeholder
- [x] Show Case anywhere the resolution was shown
- [x] Verify the form and the screens that display a debate

## Summary of Changes

Debates use a **Case** field for the affirmative case of the round (placeholder: "e.g. Block arms sales to Turkey"). The PocketBase column stays `resolution`; the app maps it to `caseTitle` and shows "Case" on the create/edit form, debate detail, debate cards, and ballot headers.
