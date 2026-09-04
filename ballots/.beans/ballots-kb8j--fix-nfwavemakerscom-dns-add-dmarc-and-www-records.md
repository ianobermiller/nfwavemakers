---
# ballots-kb8j
title: 'Fix nfwavemakers.com DNS: add DMARC and www records'
status: completed
type: task
priority: normal
created_at: 2026-09-04T22:51:18Z
updated_at: 2026-09-04T23:09:46Z
---

Cloudflare dashboard flags two recommendations for the nfwavemakers.com zone:

1. No DMARC record, so spoofed mail from @nfwavemakers.com is not rejected. SPF already exists (v=spf1 include:_spf.mx.cloudflare.net ~all).
2. No www record, so visitors cannot reach www.nfwavemakers.com. Apex is proxied through Cloudflare (104.21.9.5 / 172.67.140.205).

Wrangler cannot manage DNS records (no dns command; stored OAuth token only has zone:read), so these must be created through the Cloudflare API v4 with a Zone:DNS:Edit token.

Planned records:
- TXT _dmarc -> v=DMARC1; p=quarantine; (enforcing, per user choice)
- CNAME www -> nfwavemakers.com, proxied

## Todo
- [x] Obtain Cloudflare API token with Zone:DNS:Edit
- [x] Create TXT _dmarc record
- [x] Create CNAME www record (proxied)
- [x] Verify both resolve via dig
- [x] Add www.nfwavemakers.com as a Pages custom domain on project nfwavemakers (DNS alone returned 522)

## Summary of Changes
Created DNS via Cloudflare API (wrangler cannot manage zone DNS):
- TXT `_dmarc.nfwavemakers.com` → `v=DMARC1; p=quarantine;`
- Proxied CNAME `www.nfwavemakers.com` → `nfwavemakers.com`

Then attached `www.nfwavemakers.com` to the `nfwavemakers` Pages project so the proxy has an origin. Verified DMARC on 1.1.1.1 and `https://www.nfwavemakers.com` returns 200 with the club site title.

Token was used from clipboard and not stored in the repo. Recommend revoking the API token in the Cloudflare dashboard now that the records exist.
