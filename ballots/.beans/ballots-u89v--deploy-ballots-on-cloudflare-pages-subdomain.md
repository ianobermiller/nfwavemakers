---
# ballots-u89v
title: Deploy ballots on Cloudflare Pages subdomain
status: completed
type: task
priority: normal
created_at: 2026-09-04T17:13:14Z
updated_at: 2026-09-04T21:33:57Z
---

Host the ballots SPA at https://ballots.nfwavemakers.com via Cloudflare Pages (same as the club site). Keep the marketing site on Pages; make /ballots a static redirect to the subdomain.

- [x] Serve the Vite app from the domain root (drop /ballots/ base path)
- [x] Add Cloudflare Pages config and SPA fallback for the ballots app
- [x] Stop embedding the SPA in the club-site build; redirect /ballots to the subdomain
- [x] Point Convex auth SITE_URL at the new origin
- [x] Create/link the Pages project and custom domain if wrangler can

## Notes

Wrangler is authenticated as nfwavemakers@gmail.com. Created Pages project `nfwm-ballots` (https://nfwm-ballots.pages.dev). Local production build is ready in `dist/`. Agent cannot publish or attach the custom domain from this session; remaining: `npm run pages:deploy`, custom domain `ballots.nfwavemakers.com`, Convex `SITE_URL`, club-site redirect push.

## Summary of Changes

Ballots SPA is on Cloudflare Pages project `nfwm-ballots` at https://ballots.nfwavemakers.com (also https://nfwm-ballots.pages.dev). Club site 301s `/ballots` there. Convex prod `SITE_URL` is the subdomain; auth functions were deployed. Custom domain CNAME is proxied; HTTPS 200 confirmed.
