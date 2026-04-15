#!/bin/bash
set -euo pipefail
script_dir="$(cd "$(dirname "$0")" && pwd)"
repo_root="$(cd "$script_dir/../.." && pwd)"
exec bash "$repo_root/scripts/model-routing/open-custom-routing-demo-terminals.sh"
