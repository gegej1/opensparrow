#!/bin/bash
set -euo pipefail

script_dir="$(cd "$(dirname "$0")" && pwd)"
repo_root="$(cd "$script_dir/../.." && pwd)"

resolve_runtime_root() {
  local candidate
  for candidate in "${USB_RUNTIME_ROOT:-}" "$repo_root/vendor/mac-openclaw" "$repo_root/runtime"; do
    if [[ -n "$candidate" && -d "$candidate" ]]; then
      printf '%s\n' "$candidate"
      return 0
    fi
  done
  return 1
}

resolve_node_bin() {
  local runtime_root="$1"
  local candidate
  for candidate in "$runtime_root/bin/node" "$runtime_root/node/bin/node" "$runtime_root/node/node"; do
    if [[ -x "$candidate" ]]; then
      printf '%s\n' "$candidate"
      return 0
    fi
  done
  return 1
}

runtime_root="$(resolve_runtime_root)"
node_bin="$(resolve_node_bin "$runtime_root")"

exec "$node_bin" "$repo_root/scripts/model-routing/manage-clawrouter.mjs" enable "$@"
