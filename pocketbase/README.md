# Club PocketBase (`pb.nfwavemakers.com`)

Custom PocketBase binary for NF Wavemakers: passkey routes plus JS hooks and
migrations from `ballots/pocketbase/`. It runs as a **second process** on the
same Oracle VM as the family instance at `pb.obermillers.com`. Auth and data
are not shared.

Stack: **Oracle Linux ARM VM** → **Caddy** (HTTPS) → **PocketBase** on
`127.0.0.1:8091`.

| | Family | Club |
|---|---|---|
| Hostname | `pb.obermillers.com` | `pb.nfwavemakers.com` |
| Port | `127.0.0.1:8090` | `127.0.0.1:8091` |
| Unit | `pocketbase.service` | `pb-nfw.service` |
| User | `pocketbase` | `pb-nfw` |
| Directory | `/opt/pocketbase` | `/opt/pb-nfw` |
| Source repo | obermillers.com | this repo |

Public IPv4: `129.213.88.91` (us-ashburn-1). SSH: `opc`, key
`~/.ssh/oracle-pocketbase`.

## Recreate from scratch

### 1. DNS

In Cloudflare for `nfwavemakers.com`, create an **A** record:

- Name: `pb`
- Content: `129.213.88.91`
- Proxy: **DNS only** (grey cloud) so Caddy can obtain a Let’s Encrypt cert

Wait until it resolves:

```bash
dig +short pb.nfwavemakers.com
```

### 2. Build the binary (on a Mac)

```bash
cd pocketbase
make linux-arm64
```

### 3. Install on the VM

From this repo (or after copying `pocketbase/` and `ballots/pocketbase/` onto
the VM):

```bash
scp -i ~/.ssh/oracle-pocketbase \
  pocketbase/dist/pocketbase-linux-arm64 \
  opc@129.213.88.91:/tmp/pocketbase-linux-arm64

# Copy the trees the setup script expects, or clone the repo on the VM.
rsync -az -e 'ssh -i ~/.ssh/oracle-pocketbase' \
  pocketbase/ ballots/pocketbase/ \
  opc@129.213.88.91:~/nfw-pb/

ssh -i ~/.ssh/oracle-pocketbase opc@129.213.88.91
sudo BINARY=/tmp/pocketbase-linux-arm64 \
  HOOKS_SRC=$HOME/nfw-pb/pb_hooks \
  MIGRATIONS_SRC=$HOME/nfw-pb/pb_migrations \
  bash $HOME/nfw-pb/deploy/setup-second-instance.sh
```

When the checkout is already on the VM next to `ballots/`, the script finds
hooks and migrations automatically:

```bash
sudo BINARY=/tmp/pocketbase-linux-arm64 bash pocketbase/deploy/setup-second-instance.sh
```

### 4. Superuser, SMTP, batch

```bash
sudo -u pb-nfw /opt/pb-nfw/pocketbase superuser upsert YOU@example.com 'a-strong-password'
```

Open `https://pb.nfwavemakers.com/_/` .

- **Settings → Application:** Application URL `https://pb.nfwavemakers.com`,
  trusted proxy headers already set by migration `1799000000_ballots_instance_settings.js`
- **Settings → Mail:** configure SMTP (same provider as the family instance if
  you want)
- Batch API is enabled by that same migration on first boot

Store the superuser email/password as GitHub Actions secrets
`PB_SUPERUSER_EMAIL` and `PB_SUPERUSER_PASSWORD` so lesson seeding can run on
deploy. Store the `opc` private key as `POCKETBASE_SSH_KEY` (same key the
family repo uses).

### 5. App

`.env.production` is `VITE_POCKETBASE_URL=https://pb.nfwavemakers.com`. Club
fields live on `users`. Collections are `debates`, `ballots`, `speaker_evals`,
and `lessons`.

## Push deploy

`.github/workflows/pocketbase.yml` runs on pushes to `main` that touch
`pocketbase/`, `ballots/pocketbase/`, or lesson content. It:

1. Builds `linux-arm64`
2. Installs the binary under `/opt/pb-nfw`
3. Syncs `pb_hooks` and `pb_migrations` (migrations apply on restart)
4. Restarts **only** `pb-nfw` (the family unit stays up)
5. Seeds any missing `lessons` rows

Cloudflare Pages already publishes the frontend from `main`. A single push that
changes UI and schema updates both surfaces once Pages and this workflow finish.

Manual hook deploys (`npm run deploy:hooks`) target `/opt/pb-nfw` and restart
`pb-nfw` for emergencies. Prefer the Action.

## Local binary

```bash
cd pocketbase && make build
```

E2E uses `ballots/scripts/local-pocketbase.mjs`, which builds this module and
serves with data under `ballots/pocketbase/.pb-test/pb_data` so hooks and
migrations load automatically.
