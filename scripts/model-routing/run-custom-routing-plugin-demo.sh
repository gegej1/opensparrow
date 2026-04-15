#!/bin/bash
set -euo pipefail
script_dir="$(cd "$(dirname "$0")" && pwd)"
repo_root="$(cd "$script_dir/../.." && pwd)"
: "${OPENSPARROW_ROUTER_BASE_URL:?missing OPENSPARROW_ROUTER_BASE_URL}"
: "${OPENSPARROW_ROUTER_API_KEY:?missing OPENSPARROW_ROUTER_API_KEY}"
exec bash "$repo_root/scripts/model-routing/run-openclaw-custom-plugin.sh" gateway run --allow-unconfigured --force --port 19191 --token model-routing-lab-token --verbose
