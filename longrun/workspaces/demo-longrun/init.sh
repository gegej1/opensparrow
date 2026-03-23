#!/usr/bin/env bash
set -euo pipefail

# Replace this script with project-specific setup and startup.
# Keep this script idempotent so every new session can run it safely.

echo "[init] Starting workspace bootstrap..."

if [ -f package.json ]; then
  echo "[init] Detected package.json"
  if command -v npm >/dev/null 2>&1; then
    npm install
  fi
fi

echo "[init] Add project startup commands here"
# Example:
# npm run dev

echo "[init] Done"
