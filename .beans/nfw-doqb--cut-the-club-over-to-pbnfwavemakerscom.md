---
# nfw-doqb
title: Cut the club over to pb.nfwavemakers.com
status: draft
type: task
created_at: 2026-11-06T12:11:44Z
updated_at: 2026-11-06T12:11:44Z
---

Copy auth users that have ballots profiles, the ballots_* collections, and file fields from pb.obermillers.com onto pb.nfwavemakers.com (keep auth record ids for passkeys). Point `.env.production` at `https://pb.nfwavemakers.com`, configure SMTP on the new instance, and remove the ballots hooks/collections from the family PocketBase when the app is stable on the club host.

Blocked on DNS for `pb.nfwavemakers.com` resolving, and on landing bean nfw-44t1.
