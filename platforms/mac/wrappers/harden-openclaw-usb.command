#!/bin/bash
set -euo pipefail

script_dir="$(cd "$(dirname "$0")" && pwd)"

resolve_primary_launcher() {
  local candidate
  for candidate in \
    "$script_dir/01-开始部署.command" \
    "$script_dir/../01-开始部署.command" \
    "$script_dir/../../01-开始部署.command" \
    "$script_dir/../../../01-开始部署.command"; do
    if [[ -f "$candidate" ]]; then
      printf '%s\n' "$candidate"
      return 0
    fi
  done
  return 1
}

if ! primary_launcher="$(resolve_primary_launcher)"; then
  echo "[ERROR] 找不到 01-开始部署.command，无法回到 canonical UI/Dashboard 控制面。" >&2
  exit 1
fi

printf '提示：harden-openclaw-usb.command 现仅作为高级兼容 / handoff 入口。\n'
printf '今晚正式支持面请从根目录 01-开始部署.command 进入，再在 UI / Dashboard 中完成操作。\n'
printf '即将转交：%s\n' "$primary_launcher"

exec bash "$primary_launcher" "$@"
