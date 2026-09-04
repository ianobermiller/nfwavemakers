---
# ballots-sqx6
title: Redirect www.nfwavemakers.com to apex
status: completed
type: task
priority: normal
created_at: 2026-09-04T23:10:26Z
updated_at: 2026-09-04T23:19:23Z
---

www currently serves the Pages site directly. User wants www to 301 to the bare domain nfwavemakers.com (preserve path/query).

## Todo
- [x] Add Cloudflare/Pages redirect from www to https://nfwavemakers.com
- [x] Verify www returns 301 to apex and apex still 200

## Summary of Changes
Zone Redirect Rules were not available (wrangler OAuth is zone:read; DNS token was not retained). Pages `_redirects` cannot match on hostname, so `_build.mjs` now emits `_site/_worker.js` that 301s `www.nfwavemakers.com` to `https://nfwavemakers.com` (path and query preserved) and still 301s `/ballots` to the ballots subdomain. Deployed to Pages project `nfwavemakers`.

Verified:
- `www /` → 301 `https://nfwavemakers.com/`
- `www /foo?bar=1` → 301 `https://nfwavemakers.com/foo?bar=1`
- apex `/` → 200
- apex `/ballots` → 301 `https://ballots.nfwavemakers.com/`
- following www lands on the club site title
