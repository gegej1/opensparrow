#!/bin/bash
set -euo pipefail

script_dir="$(cd "$(dirname "$0")" && pwd)"
pack_root="$(cd "$script_dir/.." && pwd)"
repo_root="$(cd "$script_dir/../../.." && pwd)"
export OPENCLAW_PROFILE_NAME="${OPENCLAW_PROFILE_NAME:-usb-portable}"

if [[ -f "$pack_root/scripts/openclaw-usb/harden-local-feishu.sh" ]]; then
  harden_script="$pack_root/scripts/openclaw-usb/harden-local-feishu.sh"
elif [[ -f "$repo_root/scripts/openclaw-usb/harden-local-feishu.sh" ]]; then
  harden_script="$repo_root/scripts/openclaw-usb/harden-local-feishu.sh"
else
  echo "[ERROR] harden-local-feishu.sh not found."
  exit 1
fi

bash "$harden_script" --profile "$OPENCLAW_PROFILE_NAME" --dm-policy pairing --allow-from-json '[]' --require-mention true

echo
echo "Hardening complete. Press Enter to close."
read -r _
