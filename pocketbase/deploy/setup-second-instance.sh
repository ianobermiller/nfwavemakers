#!/usr/bin/env bash
# Install a second PocketBase beside the family instance on the Oracle VM.
# Does not touch /opt/pocketbase or the pb.obermillers.com Caddy site.
#
# Prerequisites:
#   - DNS A record pb.nfwavemakers.com → this VM's public IPv4 (DNS only, not proxied)
#   - Family PocketBase already running (Caddy installed)
#   - A linux-arm64 binary at /tmp/pocketbase-linux-arm64, or this repo's pocketbase/ on the VM
#
# Usage on the VM:
#   sudo bash pocketbase/deploy/setup-second-instance.sh
#   # or after scp'ing a built binary:
#   sudo BINARY=/tmp/pocketbase-linux-arm64 bash pocketbase/deploy/setup-second-instance.sh
set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root: sudo $0" >&2
  exit 1
fi

DOMAIN="${DOMAIN:-pb.nfwavemakers.com}"
PB_DIR="${PB_DIR:-/opt/pb-nfw}"
PB_USER="${PB_USER:-pb-nfw}"
PB_PORT="${PB_PORT:-8091}"
UNIT_NAME="${UNIT_NAME:-pb-nfw}"
GOMEMLIMIT="${GOMEMLIMIT:-512MiB}"
BINARY="${BINARY:-}"

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_pocketbase="$(cd "${script_dir}/.." && pwd)"
hooks_src="${HOOKS_SRC:-${repo_pocketbase}/../ballots/pocketbase/pb_hooks}"
migrations_src="${MIGRATIONS_SRC:-${repo_pocketbase}/../ballots/pocketbase/pb_migrations}"

if [[ -z "${BINARY}" ]]; then
  if [[ -x "${repo_pocketbase}/dist/pocketbase-linux-arm64" ]]; then
    BINARY="${repo_pocketbase}/dist/pocketbase-linux-arm64"
  elif [[ -x "${repo_pocketbase}/pocketbase" ]]; then
    BINARY="${repo_pocketbase}/pocketbase"
  else
    echo "Set BINARY to a built pocketbase executable, or build linux-arm64 first." >&2
    exit 1
  fi
fi

if [[ ! -d "${hooks_src}" ]]; then
  echo "Missing hooks directory: ${hooks_src}" >&2
  exit 1
fi
if [[ ! -d "${migrations_src}" ]]; then
  echo "Missing migrations directory: ${migrations_src}" >&2
  exit 1
fi

if ! id -u "${PB_USER}" >/dev/null 2>&1; then
  useradd --system --home "${PB_DIR}" --shell /usr/sbin/nologin "${PB_USER}"
fi

install -d -o "${PB_USER}" -g "${PB_USER}" -m 0750 "${PB_DIR}"
install -d -o "${PB_USER}" -g "${PB_USER}" -m 0750 "${PB_DIR}/pb_data"
install -d -o "${PB_USER}" -g "${PB_USER}" -m 0755 "${PB_DIR}/pb_hooks"
install -d -o "${PB_USER}" -g "${PB_USER}" -m 0755 "${PB_DIR}/pb_migrations"

install -o "${PB_USER}" -g "${PB_USER}" -m 0755 "${BINARY}" "${PB_DIR}/pocketbase"
rsync -a --delete "${hooks_src}/" "${PB_DIR}/pb_hooks/"
rsync -a --delete "${migrations_src}/" "${PB_DIR}/pb_migrations/"
chown -R "${PB_USER}:${PB_USER}" "${PB_DIR}/pb_hooks" "${PB_DIR}/pb_migrations"

unit_path="/etc/systemd/system/${UNIT_NAME}.service"
cat >"${unit_path}" <<EOF
[Unit]
Description=NF Wavemakers PocketBase
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=${PB_USER}
Group=${PB_USER}
WorkingDirectory=${PB_DIR}
ExecStart=${PB_DIR}/pocketbase serve --http=127.0.0.1:${PB_PORT}
Restart=always
RestartSec=5s
LimitNOFILE=4096
Environment=GOMEMLIMIT=${GOMEMLIMIT}
Environment=PASSKEY_RP_DOMAINS=nfwavemakers.com,localhost
Environment="PASSKEY_RP_NAME=NF Wavemakers"
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=${PB_DIR}

[Install]
WantedBy=multi-user.target
EOF

caddyfile=/etc/caddy/Caddyfile
if ! grep -qF "${DOMAIN}" "${caddyfile}"; then
  cat >>"${caddyfile}" <<EOF

${DOMAIN} {
	encode gzip
	request_body {
		max_size 32MB
	}
	reverse_proxy 127.0.0.1:${PB_PORT} {
		header_up X-Real-IP {remote_host}
		header_up X-Forwarded-For {remote_host}
		header_up X-Forwarded-Proto {scheme}
		transport http {
			read_timeout 360s
		}
	}
}
EOF
fi

systemctl daemon-reload
systemctl enable --now "${UNIT_NAME}"
caddy validate --config "${caddyfile}"
systemctl reload caddy

echo
echo "Installed ${UNIT_NAME} at ${PB_DIR} on 127.0.0.1:${PB_PORT}"
echo "Create a superuser (once):"
echo "  sudo -u ${PB_USER} ${PB_DIR}/pocketbase superuser upsert YOU@example.com 'a-strong-password'"
echo "Dashboard: https://${DOMAIN}/_/"
echo "Configure SMTP in the dashboard before sending OTP / reset mail."
