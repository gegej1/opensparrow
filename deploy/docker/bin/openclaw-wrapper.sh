#!/usr/bin/env bash

set -euo pipefail

app_root="${OPENSPARROW_APP_ROOT:-/opt/opensparrow}"
vendor_root="${app_root}/vendor/linux-openclaw"
entry="${vendor_root}/bin/node_modules/openclaw/openclaw.mjs"
candidate_node="${vendor_root}/bin/node"

if [[ -x "$candidate_node" ]] && "$candidate_node" --version >/dev/null 2>&1; then
  node_bin="$candidate_node"
elif command -v node >/dev/null 2>&1; then
  node_bin="$(command -v node)"
else
  echo "[ERROR] Node runtime not found for openclaw wrapper." >&2
  exit 1
fi

exec "$node_bin" "$entry" "$@"
