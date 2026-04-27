#!/bin/bash
set -euo pipefail

script_dir="$(cd "$(dirname "$0")" && pwd)"

resolve_pack_root() {
  local candidate
  for candidate in \
    "$script_dir" \
    "$script_dir/.." \
    "$script_dir/../../.."; do
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

port_is_free() {
  local port="$1"
  if command -v lsof >/dev/null 2>&1; then
    ! lsof -nP -iTCP:"$port" -sTCP:LISTEN -t >/dev/null 2>&1
    return $?
  fi
  return 0
}

resolve_free_port() {
  local start_port="$1"
  local port
  for ((port=start_port; port<start_port+100; port++)); do
    if port_is_free "$port"; then
      printf '%s\n' "$port"
      return 0
    fi
  done
  printf '%s\n' "$start_port"
}

clear_quarantine_if_possible() {
  local target="$1"
  if ! command -v xattr >/dev/null 2>&1; then
    return 0
  fi
  if is_git_checkout "$target"; then
    xattr -d com.apple.quarantine "$target" 2>/dev/null || true
    return 0
  fi
  xattr -dr com.apple.quarantine "$target" 2>/dev/null || true
}

is_git_checkout() {
  local target="$1"
  [[ -e "$target/.git" ]]
}

is_source_checkout() {
  local target="$1"
  is_git_checkout "$target"
}

verify_runtime_cpu_arch() {
  local node_bin="$1"
  local host_arch
  local node_desc

  host_arch="$(uname -m 2>/dev/null || true)"
  if [[ "$host_arch" != "arm64" && "$host_arch" != "x86_64" ]]; then
    return 0
  fi
  if ! command -v file >/dev/null 2>&1; then
    return 0
  fi

  node_desc="$(file "$node_bin" 2>/dev/null || true)"
  if [[ -z "$node_desc" ]]; then
    return 0
  fi
  if [[ "$node_desc" != *"$host_arch"* ]]; then
    echo "错误：bundled Node 架构与本机不匹配。" >&2
    echo "本机架构：$host_arch" >&2
    echo "Node 检测：$node_desc" >&2
    echo "请重新获取包含 $host_arch slice 的 GTClaw macOS 交付包。" >&2
    read -r -p "按 Enter 关闭..." _
    exit 1
  fi
}

verify_node_tool_symlinks() {
  local runtime_root="$1"
  local tool
  for tool in npm npx corepack; do
    local candidate="$runtime_root/bin/$tool"
    if [[ -e "$candidate" && ! -L "$candidate" ]]; then
      echo "错误：$candidate 不是 symlink。" >&2
      echo "这通常表示外层 zip 打包时压扁了 Node 工具链 symlink，会导致 npm install 失败。" >&2
      echo "请使用保留 symlink 的交付包重新解压。" >&2
      read -r -p "按 Enter 关闭..." _
      exit 1
    fi
  done
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

clear_quarantine_if_possible "$pack_root"
verify_runtime_cpu_arch "$node_bin"
verify_node_tool_symlinks "$runtime_root"

launcher_role="packaged-root"
mode_label="packaged runtime hardening"

if is_source_checkout "$pack_root"; then
  launcher_role="source-developer"
  mode_label="source developer/debug mode"
fi

export OPENCLAW_HOME="${OPENCLAW_HOME:-$pack_root/.gtclaw-state}"
mkdir -p "$OPENCLAW_HOME"
export OPENCLAW_PROFILE="${OPENCLAW_PROFILE:-gtclaw-portable}"
export OPENCLAW_GATEWAY_PORT="${OPENCLAW_GATEWAY_PORT:-$(resolve_free_port 18929)}"
export OPENSPARROW_ROUTER_PORT="${OPENSPARROW_ROUTER_PORT:-$(resolve_free_port 18412)}"
export OPENSPARROW_UI_PORT="${OPENSPARROW_UI_PORT:-$(resolve_free_port 19000)}"
export USB_RUNTIME_ROOT="${USB_RUNTIME_ROOT:-$runtime_root}"
export OPENSPARROW_AUTO_OPEN="${OPENSPARROW_AUTO_OPEN:-1}"
export OPENSPARROW_LAUNCHER_ROLE="${OPENSPARROW_LAUNCHER_ROLE:-$launcher_role}"

if [[ "$launcher_role" == "source-developer" ]]; then
  export OPENSPARROW_PACKAGED_RUNTIME="${OPENSPARROW_PACKAGED_RUNTIME:-0}"
  export OPENSPARROW_REQUIRE_BUNDLED_PLUGINS="${OPENSPARROW_REQUIRE_BUNDLED_PLUGINS:-0}"
else
  export OPENSPARROW_PACKAGED_RUNTIME="${OPENSPARROW_PACKAGED_RUNTIME:-1}"
  export OPENSPARROW_REQUIRE_BUNDLED_PLUGINS="${OPENSPARROW_REQUIRE_BUNDLED_PLUGINS:-1}"
fi

printf '正在启动 GTClaw 管理界面...\n'
if [[ "$launcher_role" == "source-developer" ]]; then
  printf '提示：这是源码 source developer/debug mode，不是 packaged 用户安装入口。\n'
  printf '如需验证 packaged 安装，请从交付包根目录的 01-开始部署.command 启动。\n'
fi
printf 'Home: %s\n' "$OPENCLAW_HOME"
printf 'Profile: %s\n' "$OPENCLAW_PROFILE"
printf 'Gateway: %s\n' "$OPENCLAW_GATEWAY_PORT"
printf 'Router: %s\n' "$OPENSPARROW_ROUTER_PORT"
printf 'UI: %s\n' "$OPENSPARROW_UI_PORT"
printf 'Runtime: %s\n' "$USB_RUNTIME_ROOT"
printf 'Mode: %s\n' "$mode_label"

exec "$node_bin" "$server_file"
