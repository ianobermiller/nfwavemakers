---
# nfw-44t1
title: Host the club PocketBase on its own
status: completed
type: task
priority: normal
created_at: 2026-11-06T12:01:40Z
updated_at: 2026-11-06T12:11:56Z
---

Run a PocketBase for this app on the same VM as the family instance, built and deployed from this repo.

pb.nfwavemakers.com reverse-proxies to a second process (pb-nfw, /opt/pb-nfw, 127.0.0.1:8091). A push to main installs the binary, hooks, and migrations, restarts only that process, and seeds missing lessons. The production frontend stays on pb.obermillers.com until the auth and ballot records are copied.

## Tasks

- [x] Custom PocketBase binary with passkeys, JS hooks, and migrations on boot
- [x] systemd unit and Caddy site for pb.nfwavemakers.com (DNS A record still needs creating in Cloudflare)
- [x] GitHub Action deploys the binary, hooks, migrations, and lesson seed on push
- [x] Notes to recreate the instance from scratch

## Summary of Changes

Dedicated club PocketBase on the same Oracle VM as the family instance:

- Custom binary in `pocketbase/` (passkeys + JSVM hooks/migrations), no obermillers dependency
- `pb-nfw` systemd unit on `127.0.0.1:8091` under `/opt/pb-nfw`, Caddy site for `pb.nfwavemakers.com`
- GitHub Action builds/deploys binary, hooks, migrations, and seeds lessons; secrets `POCKETBASE_SSH_KEY`, `PB_SUPERUSER_EMAIL`, `PB_SUPERUSER_PASSWORD`
- Recreation notes in `pocketbase/README.md`
- Production frontend still uses `pb.obermillers.com` until cutover (`nfw-doqb`)

**Still needed from a human:** Cloudflare A record `pb` → `129.213.88.91` (DNS only, not proxied) so Caddy can issue TLS. Wrangler OAuth cannot write DNS on this zone.
