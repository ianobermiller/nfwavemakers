# NF Wavemakers Ballots

Judge debate rounds, record speaker scores, and share feedback with students.

The React app talks to PocketBase for authentication, records, files, access
rules, and realtime updates. The club instance is `https://pb.nfwavemakers.com`
(built from `pocketbase/` in this repo). `.env.production` may still point at
the older shared `https://pb.obermillers.com` until the data cutover; see
[`pocketbase/README.md`](pocketbase/README.md).

## Develop

```bash
npm install
npm run dev
```

The UI is available at `http://localhost:5173`. `VITE_POCKETBASE_URL` defaults to
the value in `.env.production` and can be overridden in `.env.local`.

## PocketBase schema

Hooks and schema migrations live in `ballots/pocketbase/`. The custom binary in
`pocketbase/` loads them on boot from `/opt/pb-nfw`. They:

- create `ballots_profiles`, `ballots_debates`, `ballots_ballots`,
  `ballots_speaker_evals`, and `ballots_lessons`;
- enable the batch API and set app / trusted-proxy metadata;
- add indexes, relation limits, and record-level access rules.

Every app-owned collection is prefixed with `ballots_`. Debate teams and judges
relate to `ballots_profiles`. Ballot and speaker-evaluation changes use the
batch API so autosaves remain transactional. Club lesson notes live in
`ballots_lessons` (markdown bodies); only signed-in members can list or view
them, and only admins can write. Pushing lesson markdown to `main` seeds any
missing year/number pairs; you can also run
`ALLOW_REMOTE_LESSON_SEED=1 npm run seed:lessons` by hand.

Make the first administrator by setting their `ballots_profiles.role` to `admin`
in the PocketBase dashboard. Admins can create student, parent, and admin
accounts from Manage Users (one at a time or from a CSV of names and emails).
Created accounts store email on the profile so they appear in assignment pickers
before the person signs in. If the email already has a `users` auth record (and
no ballots profile yet), Manage Users attaches a profile through the admin-only
`/api/ballots/link-profile` hook instead of failing. Users can also register
themselves with email/password or sign in with an email OTP. Self-signups stay
pending until the person verifies their email and a club admin takes the
Approval action on Manage Users. Accounts an admin creates are already approved.
Password resets use PocketBase's configured email flow.

## Test data

Seeding requires a dedicated PocketBase test instance and superuser:

```bash
POCKETBASE_TEST_URL=http://127.0.0.1:8090 \
PB_SUPERUSER_EMAIL=admin@example.com \
PB_SUPERUSER_PASSWORD=... \
npm run seed:test
```

The seed command refuses remote instances unless `ALLOW_REMOTE_TEST_SEED=1` is
explicitly set.

## Commands

- `npm run dev` — Vite development server
- `npm run check` — types, lint, and unused-code checks
- `npm run build` — production build
- `npm run test:e2e` — Playwright against the configured test PocketBase
- `npm run seed:lessons` — create missing lesson records from `ballots/content/lessons`
- `npm run deploy:hooks` — emergency SCP of `pb_hooks` to `/opt/pb-nfw` (prefer the Action)
- `npm run pages:deploy` — deploy `_site` to Cloudflare Pages

## Deploy

**Frontend.** The site is the `nfwavemakers` Cloudflare Pages project at
`https://nfwavemakers.com`. `www` and `ballots.nfwavemakers.com` redirect there.
Pushing to `main` publishes automatically. Use the manual path only for a build
that is not on `main`:

```bash
npx wrangler login
npm run pages:deploy
```

Cloudflare Pages should use the repo root, build command `npm run build`, and
output directory `_site`. Routing is path based, and Pages already serves
`index.html` for paths that match no asset, so no `_redirects` rewrite is
needed; Pages rejects the usual `/* /index.html 200` rule as a loop.

**Backend.** Pushes that touch `pocketbase/` or `ballots/pocketbase/` run
`.github/workflows/pocketbase.yml`, which installs the binary, hooks, and
migrations on the Oracle VM and restarts only `pb-nfw`. See
[`pocketbase/README.md`](pocketbase/README.md) to recreate the instance.

`VITE_POCKETBASE_URL` is public and checked into `.env.production`. PocketBase
superuser credentials must never be added to the frontend or committed; they
belong in GitHub Actions secrets (`PB_SUPERUSER_EMAIL`,
`PB_SUPERUSER_PASSWORD`, `POCKETBASE_SSH_KEY`).
