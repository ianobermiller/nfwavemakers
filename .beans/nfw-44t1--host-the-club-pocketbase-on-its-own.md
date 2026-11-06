---
# nfw-44t1
title: Host the club PocketBase on its own
status: todo
type: task
created_at: 2026-11-06T12:01:40Z
updated_at: 2026-11-06T12:01:40Z
---

Run a PocketBase for this app on the same VM as the family instance, built and deployed from this repo.

pb.nfwavemakers.com reverse-proxies to a second process (pb-nfw, /opt/pb-nfw, 127.0.0.1:8091). A push to main installs the binary, hooks, and migrations, restarts only that process, and seeds missing lessons. The production frontend stays on pb.obermillers.com until the auth and ballot records are copied.

## Tasks

- [ ] Custom PocketBase binary with passkeys, JS hooks, and migrations on boot
- [ ] systemd unit, Caddy site, and DNS for pb.nfwavemakers.com
- [ ] GitHub Action deploys the binary, hooks, migrations, and lesson seed on push
- [ ] Notes to recreate the instance from scratch
