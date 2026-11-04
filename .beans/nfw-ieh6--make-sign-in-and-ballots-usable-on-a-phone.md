---
# nfw-ieh6
title: Make sign-in and ballots usable on a phone
status: completed
type: bug
priority: high
created_at: 2026-11-03T23:59:39Z
updated_at: 2026-11-04T03:45:49Z
---

The site and ballots app are hard to use on phones — especially de-googled Android, where passkey APIs look present without a working credential manager and break password autofill.

## Tasks

- [x] Check the public site, sign-in, profile setup, dashboard, ballot form, debate view, and admin screens at a phone width
- [x] Stop horizontal overflow in the header, score rows, and other cramped layouts
- [x] Keep form fields from zooming the page (16px inputs)
- [x] Make primary controls large enough to tap
- [x] Hide passkeys unless a platform authenticator or conditional mediation actually works
- [x] Keep email/password autocomplete free of the webauthn token when passkeys are unusable
- [x] Verify the sign-in-to-ballots path in a phone-sized browser

## Notes

iOS looked fine because current Safari understands the CSS Tailwind 4 ships. Older Android engines do not. Bromite-era Chromium (around 108) and Firefox ESR 115 drop `@layer` rules, `oklch()` colors, and gradients written as `to bottom right in oklab`. When those fail, layout utilities never apply and white text on hero gradients disappears.

The build now unwraps `@layer`, converts `oklch()` to hex, and strips `in oklab` from gradient positions, targeting Chrome/WebView 80 and Firefox 90. Phone layouts also keep 16px fields, a header that can shrink, and score buttons that stack on a narrow screen.

## Summary of Changes

Older Android browsers were dropping Tailwind 4's `@layer` rules, `oklch()` colors, and `in oklab` gradients, so the layout never applied and hero text disappeared. The build now rewrites that CSS for Chrome/WebView 80 and Firefox 90. Phone screens also get a header that can shrink, 16px fields, and score buttons that stack instead of overflowing.
