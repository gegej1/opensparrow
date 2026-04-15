#!/bin/bash
set -euo pipefail
script_dir="$(cd "$(dirname "$0")" && pwd)"
repo_root="$(cd "$script_dir/../.." && pwd)"
node_bin="$repo_root/vendor/mac-openclaw/bin/node"
exec "$node_bin" "$repo_root/scripts/model-routing/chat-custom-routing-plugin.mjs" "$@"
