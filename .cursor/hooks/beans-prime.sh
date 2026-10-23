#!/usr/bin/env bash
set -euo pipefail

if ! command -v beans >/dev/null 2>&1; then
  printf '{"additional_context":"beans CLI not installed; run: brew install hmans/beans/beans"}\n'
  exit 0
fi

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

CONTEXT="$(beans prime 2>/dev/null || true)"
if [[ -z "$CONTEXT" ]]; then
  CONTEXT="Run beans prime manually. Use beans for all task tracking in nfwavemakers. Work on a bean happens in a workspace (npm run worktree:new), not in the main checkout."
fi

python3 - <<'PY' "$CONTEXT"
import json
import sys

context = sys.argv[1]
print(json.dumps({"additional_context": context}))
PY
