#!/usr/bin/env bash
set -euo pipefail

workspace_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
project_root="$(cd "$workspace_dir/../../.." && pwd)"

required_paths=(
  "AGENTS.md"
  "README.md"
  ".gitattributes"
  ".gitignore"
  ".specify/memory/constitution.md"
  "docs/项目持久化说明.md"
  "docs/多平台统一仓方案-20260323.md"
  "scripts/codex"
  "scripts/openclaw-usb/install-local-feishu.sh"
  "scripts/openclaw-usb/harden-local-feishu.sh"
  "platforms/linux/companion/使用说明.md"
  "platforms/mac/companion/使用指南-mac版.md"
  "platforms/windows/companion/使用指南.md"
  "platforms/mac/wrappers/run-openclaw-usb.command"
  "platforms/windows/wrappers/run-openclaw-usb.cmd"
  "vendor/linux-openclaw/README.md"
  "vendor/mac-openclaw/README.md"
  "vendor/windows-openclaw/package.json"
  "ui/server.mjs"
  "specs/006-opensparrow-root-unification/spec.md"
  "longrun/workspaces/openclaw-native/app_spec.md"
  "longrun/workspaces/openclaw-usb-portable/app_spec.md"
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

echo "[init] Running shell syntax checks for shared install scripts..."
bash -n scripts/openclaw-usb/*.sh
echo "[ok] scripts/openclaw-usb/*.sh"

echo "[init] Running shell syntax checks for Linux companion scripts..."
bash -n platforms/linux/companion/*.sh
echo "[ok] platforms/linux/companion/*.sh"

echo "[init] Running shell syntax checks for macOS companion scripts..."
for script_path in "${mac_shell_files[@]}"; do
  if [ -f "$script_path" ]; then
    bash -n "$script_path"
    echo "[ok] $script_path"
  else
    echo "[warn] Missing optional macOS script: $script_path"
  fi
done

echo "[init] Running shell syntax checks for macOS wrapper scripts..."
if compgen -G 'platforms/mac/wrappers/*.command' >/dev/null 2>&1; then
  bash -n platforms/mac/wrappers/*.command
  echo "[ok] platforms/mac/wrappers/*.command"
fi

if command -v git >/dev/null 2>&1 && [ -d .git ]; then
  echo "[init] Git repo detected. Short status:"
  git status --short || true
else
  echo "[warn] Git repo not initialized yet."
fi

if [ "$missing" -ne 0 ]; then
  echo "[init] Required paths are missing. Fix them before continuing."
  exit 1
fi

echo "[init] Done."
