#!/bin/bash
set -euo pipefail
script_dir="$(cd "$(dirname "$0")" && pwd)"
repo_root="$(cd "$script_dir/../.." && pwd)"
node_bin="$repo_root/vendor/mac-openclaw/bin/node"
"$node_bin" "$repo_root/scripts/model-routing/manage-custom-routing-plugin.mjs" install-runtime >/dev/null
"$node_bin" "$repo_root/scripts/model-routing/manage-custom-routing-plugin.mjs" enable >/dev/null

eval "$($node_bin "$repo_root/scripts/model-routing/manage-custom-routing-plugin.mjs" openclaw-env | sed 's/^/export /')"
lab_root="${OPENSPARROW_MODEL_ROUTING_LAB_ROOT:-$repo_root/dist/model-running-lab}"
exec "$lab_root/runtime/bin/openclaw" --profile "${OPENCLAW_PROFILE:-model-routing-lab}" "$@"
