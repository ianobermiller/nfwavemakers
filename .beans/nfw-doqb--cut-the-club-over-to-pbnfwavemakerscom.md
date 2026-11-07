---
# nfw-doqb
title: Cut the club over to pb.nfwavemakers.com
status: in-progress
type: task
priority: normal
created_at: 2026-11-06T12:11:44Z
updated_at: 2026-11-06T15:32:18Z
---

Point `.env.production` at `https://pb.nfwavemakers.com`, update the app to read club fields from `users` directly (drop `ballots_profiles`), configure SMTP on the new instance, and remove the ballots hooks/collections from the family PocketBase when the app is stable on the club host.

~~Blocked on DNS~~ Done 2026-11-06: data migrated from pb.obermillers.com to pb.nfwavemakers.com (44 users incl. passkey credentials and avatars, 4 debates, 9 ballots, 36 speaker_evals, 7 lessons; collections renamed to unprefixed; profile fields folded into `users`). Old instance left fully intact; pre-migration backup at `/opt/pb-nfw/pb_data.bak-20261106150528` on the VM.

## Cutover

- [x] App reads club fields from `users` and unprefixed collections
- [x] Migration folds `ballots_*` into that schema for fresh installs and fixes rules on the live instance
- [x] Hooks use `users` (`password_set`, OTP verified, link-profile)
- [x] `.env.production` points at `https://pb.nfwavemakers.com`
- [x] SMTP configured on the club instance (Resend, sender noreply@updates.obermillers.com)
- [x] `npm run check` and `npm run build` pass
- [ ] Land this branch so Cloudflare Pages publishes the new `VITE_POCKETBASE_URL`
- [ ] After the club site is stable on pb.nfwavemakers.com, remove ballots hooks and collections from the family PocketBase

## Summary of Changes

The app now talks to `users` for membership (role, approval, category, partner, password) and to `debates`, `ballots`, `speaker_evals`, and `lessons`. `.env.production` is `https://pb.nfwavemakers.com`. The club instance has the copied records, corrected ballot list rules, avatar thumbs, SMTP, and 6-digit sign-in codes. The family instance was not modified.

A check on 2026-11-07 found no new debates, ballots, speaker evals, or lessons on the family instance. Three passwords changed there after the copy (Ian, Brynn, Andrew), and Andrew registered a passkey; those auth fields were copied onto the club instance. A soft-deleted test debate that was created on the club instance during sign-in testing was left in place.
