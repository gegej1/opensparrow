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
  "docs/legacy-archive-freeze-20260323.md"
  "docs/runbooks/F-007-legacy-archive-docker-baseline.md"
  "scripts/codex"
  "scripts/openclaw-usb/install-local-feishu.sh"
  "scripts/openclaw-usb/harden-local-feishu.sh"
  "scripts/verify-legacy-freeze.sh"
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
  "specs/007-legacy-archive-docker-baseline/spec.md"
  "deploy/docker/Dockerfile"
  "deploy/docker/docker-compose.yml"
  "deploy/docker/.env.example"
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

echo "[init] Running shell syntax checks for repo validation scripts..."
bash -n scripts/verify-legacy-freeze.sh
echo "[ok] scripts/verify-legacy-freeze.sh"

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

echo "[init] Running shell syntax checks for Docker helper scripts..."
if compgen -G 'deploy/docker/bin/*.sh' >/dev/null 2>&1; then
  bash -n deploy/docker/bin/*.sh
  echo "[ok] deploy/docker/bin/*.sh"
fi

echo "[init] Verifying legacy freeze contract..."
bash scripts/verify-legacy-freeze.sh
echo "[ok] legacy freeze contract"

if command -v docker >/dev/null 2>&1; then
  echo "[init] Docker detected. Rendering compose config..."
  docker compose -f deploy/docker/docker-compose.yml config >/dev/null
  echo "[ok] deploy/docker/docker-compose.yml config"
else
  echo "[warn] Docker not found; skipped compose config validation."
fi

if command -v node >/dev/null 2>&1; then
  echo "[init] Running node syntax check for ui/server.mjs..."
  node --check ui/server.mjs >/dev/null
  echo "[ok] ui/server.mjs"
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
