#!/usr/bin/env bash
# Run on the VM (via SSH) after the linux-arm64 binary lands in /tmp.
# Syncs hooks + migrations from a temporary extract, replaces the binary, and
# restarts only pb-nfw.
set -euo pipefail

PB_DIR="${PB_DIR:-/opt/pb-nfw}"
PB_USER="${PB_USER:-pb-nfw}"
UNIT_NAME="${UNIT_NAME:-pb-nfw}"
BINARY_SRC="${BINARY_SRC:-/tmp/pocketbase-linux-arm64}"
BUNDLE_SRC="${BUNDLE_SRC:-/tmp/pb-nfw-bundle.tgz}"

if [[ ! -x "${BINARY_SRC}" && ! -f "${BINARY_SRC}" ]]; then
  echo "Missing binary at ${BINARY_SRC}" >&2
  exit 1
fi
if [[ ! -f "${BUNDLE_SRC}" ]]; then
  echo "Missing hooks/migrations bundle at ${BUNDLE_SRC}" >&2
  exit 1
fi

tmp="$(mktemp -d)"
trap 'rm -rf "${tmp}"' EXIT
tar -xzf "${BUNDLE_SRC}" -C "${tmp}"
# macOS tar can leave AppleDouble junk that PocketBase would try to run as JS.
find "${tmp}" \( -name '._*' -o -name '.DS_Store' \) -delete

install -d -o "${PB_USER}" -g "${PB_USER}" -m 0755 "${PB_DIR}/pb_hooks" "${PB_DIR}/pb_migrations"
rsync -a --delete "${tmp}/pb_hooks/" "${PB_DIR}/pb_hooks/"
rsync -a --delete "${tmp}/pb_migrations/" "${PB_DIR}/pb_migrations/"
chown -R "${PB_USER}:${PB_USER}" "${PB_DIR}/pb_hooks" "${PB_DIR}/pb_migrations"

systemctl stop "${UNIT_NAME}"
install -o "${PB_USER}" -g "${PB_USER}" -m 0755 "${BINARY_SRC}" "${PB_DIR}/pocketbase"
rm -f "${BINARY_SRC}" "${BUNDLE_SRC}"
systemctl start "${UNIT_NAME}"
systemctl is-active "${UNIT_NAME}"
