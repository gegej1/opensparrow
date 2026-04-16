#!/bin/bash
set -euo pipefail

script_dir="$(cd "$(dirname "$0")" && pwd)"

resolve_pack_root() {
  local candidate
  for candidate in \
    "$script_dir/.." \
    "$script_dir/../../.." \
    "$script_dir"; do
    if [[ -f "$candidate/ui/server.mjs" ]]; then
      printf '%s\n' "$(cd "$candidate" && pwd)"
      return 0
    fi
  done
  return 1
}

resolve_node_bin() {
  local runtime_root="$1"
  local candidate
  for candidate in \
    "$runtime_root/node/bin/node" \
    "$runtime_root/node/node" \
    "$runtime_root/bin/node"; do
    if [[ -x "$candidate" ]]; then
      printf '%s\n' "$candidate"
      return 0
    fi
  done
  return 1
}

if ! pack_root="$(resolve_pack_root)"; then
  echo "错误：找不到 UI 服务目录（ui/server.mjs）。" >&2
  read -r -p "按 Enter 关闭..." _
  exit 1
fi

server_file="$pack_root/ui/server.mjs"
runtime_root=""
node_bin=""
for runtime_candidate in \
  "$pack_root/runtime" \
  "$pack_root/vendor/mac-openclaw"; do
  if [[ -d "$runtime_candidate" ]] && node_bin="$(resolve_node_bin "$runtime_candidate")"; then
    runtime_root="$runtime_candidate"
    break
  fi
done

if [[ -z "$node_bin" || ! -x "$node_bin" ]]; then
  echo "错误：找不到 Node 运行时。" >&2
  echo "已检查：$pack_root/runtime 和 $pack_root/vendor/mac-openclaw" >&2
  read -r -p "按 Enter 关闭..." _
  exit 1
fi

export OPENCLAW_PROFILE="${OPENCLAW_PROFILE:-usb-portable}"
export OPENCLAW_GATEWAY_PORT="${OPENCLAW_GATEWAY_PORT:-18889}"
export USB_RUNTIME_ROOT="${USB_RUNTIME_ROOT:-$runtime_root}"
export OPENSPARROW_AUTO_OPEN="${OPENSPARROW_AUTO_OPEN:-1}"

printf '正在启动 OpenSparrow 管理界面...\n'
printf 'Profile: %s\n' "$OPENCLAW_PROFILE"
printf 'Runtime: %s\n' "$USB_RUNTIME_ROOT"

exec "$node_bin" "$server_file"
