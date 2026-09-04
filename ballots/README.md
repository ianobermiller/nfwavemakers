# NF Wavemakers Ballots

Judge debate rounds, record speaker scores, and share feedback with students.

Live data lives in [Convex](https://convex.dev). Sign-in uses Better Auth (email codes via Resend).

## Develop

You need Node 18+ and a [Convex](https://dashboard.convex.dev) account.

```bash
npm install
npx convex login
npm run dev
```

`npm run dev` runs Convex and Vite together against **local** data. The UI is at [http://localhost:5173/ballots/](http://localhost:5173/ballots/). Convex writes `VITE_CONVEX_URL` into `.env.local`.

Seed local test data and password-enabled personas:

```bash
npm run seed:test
```

All three accounts use the password `test-password`:

- `student@example.com`
- `judge@example.com`
- `admin@example.com`

Override the shared password with `TEST_ACCOUNT_PASSWORD=... npm run seed:test`. The seed command refuses to run against a non-local Convex deployment.

Frontend-only, still local Convex (backend already running):

```bash
npm run dev:frontend
```

Local UI against **production** data (does not start local Convex; writes are live):

```bash
npm run dev:prod
```

First time on a machine (or a new deployment), set auth:

```bash
npx convex env set BETTER_AUTH_SECRET="$(openssl rand -base64 32)"
npx convex env set SITE_URL http://localhost:5173
npx convex env set AUTH_RESEND_KEY re_...
npx convex env set AUTH_EMAIL 'NF Wavemakers <notifications@updates.obermillers.com>'
```

`AUTH_RESEND_KEY` is the same Resend key used by other Obermiller apps. The from-address domain is `updates.obermillers.com`.

When Better Auth plugins change, regenerate its local component schema:

```bash
npx @better-auth/cli generate --cwd convex/betterAuth --config auth.ts --output schema.ts -y
```

### Useful commands

| Command | What it does |
|---|---|
| `npm run dev` | Local Convex + Vite |
| `npm run dev:frontend` | Vite only, local Convex URL |
| `npm run dev:prod` | Vite only, production Convex data |
| `npm run seed:test` | Seed local student, judge, and admin test accounts |
| `npm run lint` | Oxlint |
| `npm run format` | Oxfmt |
| `npm run knip` | Unused export check |
| `npm run build` | Typecheck + production bundle |
| `npm run test:e2e` | Playwright (needs local Convex running) |

### Layout

```
convex/          queries, mutations, schema, auth
src/             Vite React UI
scripts/         Instant import, prod frontend
```

Ballot and debate URLs use Convex document IDs (`/ballots/debate/<id>`). Instant UUIDs will not work after import.

## Environment

Checked in (`.env`):

- `VITE_INSTANT_APP_ID` — Instant app id, only for the one-shot data import

Convex CLI writes `.env.local` (`CONVEX_DEPLOYMENT`, `VITE_CONVEX_URL`, `VITE_CONVEX_SITE_URL`). Keep secrets there, including `INSTANT_APP_ADMIN_TOKEN` if you still need to import. Optional: `VITE_CONVEX_PROD_URL` for `npm run dev:prod`.

Set these on the Convex deployment (`npx convex env list` to inspect):

| Variable | Purpose |
|---|---|
| `SITE_URL` | App origin Better Auth trusts (`http://localhost:5173` in dev) |
| `BETTER_AUTH_SECRET` | Better Auth encryption and signing secret |
| `AUTH_RESEND_KEY` | Resend API key |
| `AUTH_EMAIL` | From address for sign-in codes |

Cloud/prod is a separate deployment. Copy the same env vars with `--prod` (and set `SITE_URL` to the public origin, e.g. `https://nfwavemakers.com`). Env changes apply immediately; no redeploy.

`npx convex deploy` / the site `npm run build` push functions and the frontend; they do **not** copy env.

## Data import (Instant)

The app was migrated from InstantDB. To load Instant into the **current** Convex deployment:

```bash
# INSTANT_APP_ADMIN_TOKEN in .env.local
npm run migrate:instant
```

Production:

```bash
npm run migrate:instant:prod
```

The importer is idempotent (rows keyed by Instant id). Skip this once Instant is gone.
