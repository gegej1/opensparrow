#!/usr/bin/env bash
set -euo pipefail

workspace_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
project_root="$(cd "$workspace_dir/../../.." && pwd)"

required_paths=(
  "AGENTS.md"
  ".specify/memory/constitution.md"
  "docs/项目持久化说明.md"
  "longrun/scripts/session_start.sh"
  "vendor/linux-openclaw/README.md"
  "platforms/linux/companion/初始化.sh"
  "platforms/linux/companion/日常使用.sh"
  "vendor/mac-openclaw/README.md"
  "platforms/mac/companion/start"
  "platforms/mac/companion/stop"
  "vendor/windows-openclaw/package.json"
  "platforms/windows/companion/start-gateway.ps1"
  "platforms/windows/companion/stop-gateway.ps1"
)

mac_shell_files=(
  "platforms/mac/companion/gateway"
  "platforms/mac/companion/onboard"
  "platforms/mac/companion/pairing-feishu"
  "platforms/mac/companion/start"
  "platforms/mac/companion/stop"
)

echo "[init] Workspace dir: $workspace_dir"
echo "[init] Project root: $project_root"

cd "$project_root"

echo "[init] Checking required files and directories..."
missing=0
for path in "${required_paths[@]}"; do
  if [ -e "$path" ]; then
    echo "[ok] $path"
  else
    echo "[missing] $path"
    missing=1
  fi
done

echo "[init] Running shell syntax checks for Linux scripts..."
if compgen -G 'platforms/linux/companion/*.sh' >/dev/null 2>&1; then
  bash -n platforms/linux/companion/*.sh
  echo "[ok] platforms/linux/companion/*.sh"
else
  echo "[warn] No Linux shell scripts found for syntax check."
fi

echo "[init] Running shell syntax checks for macOS scripts..."
for script_path in "${mac_shell_files[@]}"; do
  if [ -f "$script_path" ]; then
    bash -n "$script_path"
    echo "[ok] $script_path"
  else
    echo "[warn] Missing optional macOS script: $script_path"
  fi
done

echo "[init] Source entry locations:"
echo "       Linux:   platforms/linux/companion/日常使用.sh"
echo "       macOS:   platforms/mac/companion/start"
echo "       Windows: platforms/windows/companion/start-gateway.ps1"

if [ "$missing" -ne 0 ]; then
  echo "[init] Required paths are missing. Fix them before continuing."
  exit 1
fi

echo "[init] Done."
