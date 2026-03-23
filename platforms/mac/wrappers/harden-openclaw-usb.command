#!/bin/bash
set -euo pipefail

script_dir="$(cd "$(dirname "$0")" && pwd)"
pack_root="$(cd "$script_dir/.." && pwd)"
repo_root="$(cd "$script_dir/../../.." && pwd)"
export OPENCLAW_PROFILE_NAME="${OPENCLAW_PROFILE_NAME:-usb-portable}"

canonical_script="$repo_root/scripts/openclaw-usb/harden-local-feishu.sh"
canonical_runtime="$repo_root/vendor/mac-openclaw"
packaged_script="$pack_root/scripts/openclaw-usb/harden-local-feishu.sh"
packaged_runtime="$pack_root/runtime"

if [[ -f "$canonical_script" && -d "$canonical_runtime" ]]; then
  harden_script="$canonical_script"
  export USB_RUNTIME_ROOT="${USB_RUNTIME_ROOT:-$canonical_runtime}"
elif [[ -f "$packaged_script" && -d "$packaged_runtime" ]]; then
  harden_script="$packaged_script"
  export USB_RUNTIME_ROOT="${USB_RUNTIME_ROOT:-$packaged_runtime}"
else
  echo "[ERROR] harden-local-feishu.sh not found."
  exit 1
fi

bash "$harden_script" --profile "$OPENCLAW_PROFILE_NAME" --dm-policy pairing --allow-from-json '[]' --require-mention true

echo
echo "Hardening complete. Press Enter to close."
read -r _
