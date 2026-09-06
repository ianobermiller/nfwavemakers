# NF Wavemakers Ballots

Judge debate rounds, record speaker scores, and share feedback with students.

The React app uses PocketBase at `https://pb.obermillers.com` for authentication,
records, files, access rules, and realtime updates.

## Develop

```bash
npm install
npm run dev
```

The UI is available at `http://localhost:5173`. `VITE_POCKETBASE_URL` defaults to
the production instance and can be overridden in `.env.local`.

## PocketBase schema

The schema migration is in `pocketbase/pb_migrations`. Copy that directory beside
the PocketBase executable and restart PocketBase (or run `pocketbase migrate up`).
It:

- leaves the shared `users` auth collection unchanged;
- creates `ballots_profiles`, `ballots_debates`, `ballots_ballots`, and
  `ballots_speaker_evals`;
- adds indexes, relation limits, and record-level access rules.

Every app-owned collection is prefixed with `ballots_`. Debate teams and judges
relate to `ballots_profiles`, which isolates ballot-specific names, roles,
avatars, and archive state from other apps sharing the auth collection. Ballot
and speaker-evaluation changes use PocketBase's batch API so autosaves remain
transactional. The PocketBase batch API must be enabled.

Make the first administrator by setting their `ballots_profiles.role` to `admin`
in the PocketBase dashboard. Users can then register with email/password or sign
in with an email OTP. Password resets use PocketBase's configured email flow.
Passkey sign-in will be wired to the shared PocketBase instance separately.

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
- `npm run pages:deploy` — deploy `dist` to Cloudflare Pages

## Deploy

The SPA is deployed as the `nfwm-ballots` Cloudflare Pages project at
`https://ballots.nfwavemakers.com`.

```bash
npx wrangler login
npm run pages:deploy
```

Cloudflare Pages should use root directory `ballots`, build command
`npm run build`, and output directory `dist`. `VITE_POCKETBASE_URL` is public and
is checked into `.env.production`; PocketBase superuser credentials must never be
added to the frontend or committed.
