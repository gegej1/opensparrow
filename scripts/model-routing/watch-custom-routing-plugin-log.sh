#!/bin/bash
set -euo pipefail
script_dir="$(cd "$(dirname "$0")" && pwd)"
repo_root="$(cd "$script_dir/../.." && pwd)"
log_dir="$repo_root/dist/model-running-lab/logs"
mkdir -p "$log_dir"
log_file="$log_dir/custom-routing-demo-gateway.log"

echo "[custom-routing-demo] gateway log => $log_file"
echo "[custom-routing-demo] waiting for natural-language requests..."

bash "$repo_root/scripts/model-routing/run-openclaw-custom-plugin.sh" \
  --no-color gateway run --allow-unconfigured --force --port 19191 --token model-routing-lab-token --verbose 2>&1 \
  | tee "$log_file" \
  | awk '
    /OpenSparrow custom router proxy listening/ { print; fflush(); next }
    /agent model:/ { print; fflush(); next }
    /ready \(1 plugin: opensparrow-router/ { print; fflush(); next }
    /\[opensparrow-router\]/ { print; fflush(); next }
  '
