#!/usr/bin/env bash
set -euo pipefail

workspace_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

find_project_root() {
  if git -C "$workspace_dir" rev-parse --show-toplevel >/dev/null 2>&1; then
    git -C "$workspace_dir" rev-parse --show-toplevel
    return
  fi

  # Fallback for non-git projects.
  echo "$workspace_dir"
}

run_install() {
  if [ -f pnpm-lock.yaml ]; then
    if command -v pnpm >/dev/null 2>&1; then
      pnpm install --frozen-lockfile || pnpm install
      return
    fi
    echo "[init] ERROR: pnpm-lock.yaml found but pnpm is unavailable."
    exit 1
  fi

  if [ -f yarn.lock ]; then
    if command -v yarn >/dev/null 2>&1; then
      yarn install --frozen-lockfile || yarn install
      return
    fi
    echo "[init] ERROR: yarn.lock found but yarn is unavailable."
    exit 1
  fi

  if [ -f package-lock.json ] || [ -f package.json ]; then
    if command -v npm >/dev/null 2>&1; then
      npm install
      return
    fi
    echo "[init] ERROR: Node project detected but npm is unavailable."
    exit 1
  fi

  if [ -f pyproject.toml ]; then
    if command -v uv >/dev/null 2>&1; then
      uv sync
      return
    fi
    if command -v pip >/dev/null 2>&1; then
      pip install -e .
      return
    fi
    echo "[init] ERROR: Python project detected but neither uv nor pip is available."
    exit 1
  fi

  echo "[init] No recognized package manager lockfile found. Skip dependency install."
}

run_optional_cmd() {
  local name="$1"
  local cmd="$2"

  if [ -z "$cmd" ]; then
    return
  fi

  echo "[init] Running ${name}: $cmd"
  bash -lc "$cmd"
}

# Optional overrides:
#   PROJECT_ROOT=/path/to/repo
#   SMOKE_TEST_CMD="npm run test:smoke"
#   APP_START_CMD="npm run dev"
project_root="${PROJECT_ROOT:-$(find_project_root)}"
smoke_test_cmd="${SMOKE_TEST_CMD:-}"
app_start_cmd="${APP_START_CMD:-}"

echo "[init] Workspace dir: $workspace_dir"
echo "[init] Project root: $project_root"

cd "$project_root"

echo "[init] Installing dependencies (idempotent)..."
run_install

run_optional_cmd "smoke test command" "$smoke_test_cmd"

if [ -n "$app_start_cmd" ]; then
  echo "[init] App start command configured:"
  echo "       $app_start_cmd"
  echo "[init] Run it manually in another terminal when needed."
else
  echo "[init] APP_START_CMD is not set."
  echo "[init] Example:"
  echo "       APP_START_CMD='npm run dev' ./init.sh"
fi

echo "[init] Done."
