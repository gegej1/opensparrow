#!/bin/bash
set -euo pipefail

script_dir="$(cd "$(dirname "$0")" && pwd)"
pack_root="$(cd "$script_dir/.." && pwd)"
repo_root="$(cd "$script_dir/../../.." && pwd)"
export OPENCLAW_PROFILE_NAME="${OPENCLAW_PROFILE_NAME:-usb-portable}"
export OPENCLAW_GATEWAY_PORT="${OPENCLAW_GATEWAY_PORT:-18889}"

canonical_script="$repo_root/scripts/openclaw-usb/install-local-feishu.sh"
canonical_runtime="$repo_root/vendor/mac-openclaw"
packaged_script="$pack_root/scripts/openclaw-usb/install-local-feishu.sh"
packaged_runtime="$pack_root/runtime"

if [[ -f "$canonical_script" && -d "$canonical_runtime" ]]; then
  install_script="$canonical_script"
  export USB_RUNTIME_ROOT="${USB_RUNTIME_ROOT:-$canonical_runtime}"
elif [[ -f "$packaged_script" && -d "$packaged_runtime" ]]; then
  install_script="$packaged_script"
  export USB_RUNTIME_ROOT="${USB_RUNTIME_ROOT:-$packaged_runtime}"
else
  echo "[ERROR] install-local-feishu.sh not found."
  exit 1
fi

if [[ -z "${FEISHU_APP_ID:-}" ]]; then
  read -r -p "FEISHU_APP_ID: " FEISHU_APP_ID
  export FEISHU_APP_ID
fi
if [[ -z "${FEISHU_APP_SECRET:-}" ]]; then
  read -r -s -p "FEISHU_APP_SECRET: " FEISHU_APP_SECRET
  printf '\n'
  export FEISHU_APP_SECRET
fi
if [[ -z "${OPENAI_API_KEY:-}" ]]; then
  read -r -s -p "OPENAI_API_KEY: " OPENAI_API_KEY
  printf '\n'
  export OPENAI_API_KEY
fi
if [[ -z "${OPENAI_BASE_URL:-}" ]]; then
  read -r -p "OPENAI_BASE_URL (optional, press Enter to skip): " OPENAI_BASE_URL || true
  export OPENAI_BASE_URL
fi

bash "$install_script" --profile "$OPENCLAW_PROFILE_NAME" --port "$OPENCLAW_GATEWAY_PORT"

echo
echo "Done. Press Enter to close."
read -r _
