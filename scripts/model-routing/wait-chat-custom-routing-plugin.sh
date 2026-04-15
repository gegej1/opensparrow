#!/bin/bash
set -euo pipefail
script_dir="$(cd "$(dirname "$0")" && pwd)"
repo_root="$(cd "$script_dir/../.." && pwd)"
port="${OPENSPARROW_CUSTOM_ROUTER_PORT:-8412}"
health_url="http://127.0.0.1:${port}/health"

echo "[custom-plugin-chat] waiting for $health_url"
until curl --silent --fail "$health_url" >/dev/null 2>&1; do
  sleep 1
done
exec bash "$repo_root/scripts/model-routing/chat-custom-routing-plugin.sh" "$@"
