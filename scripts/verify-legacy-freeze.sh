#!/usr/bin/env bash

set -euo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$project_root"

frozen_dirs=(
  "opensparrow_win"
  "_push_opensparrow_win"
  "openclaw-usb-feishu-delivery"
  "openclawtest"
)

canonical_dirs=(
  "platforms"
  "vendor"
  "scripts/openclaw-usb"
  "ui"
  "docs"
  "specs"
  "longrun"
  "deploy/docker"
  "dist"
)

archive_doc="docs/legacy-archive-freeze-20260323.md"

for path in "$archive_doc" ".gitignore"; do
  [[ -e "$path" ]] || {
    echo "[missing] $path" >&2
    exit 1
  }
done

for path in "${canonical_dirs[@]}"; do
  [[ -e "$path" ]] || {
    echo "[missing] canonical path: $path" >&2
    exit 1
  }
done

for dir in "${frozen_dirs[@]}"; do
  if [[ -e "archive/legacy-20260326/$dir" ]]; then
    echo "[archived] $dir -> archive/legacy-20260326/"
  elif [[ -e "$dir" ]]; then
    echo "[frozen] $dir (not yet archived)"
  else
    echo "[missing] frozen dir: $dir (not in root or archive)" >&2
    exit 1
  fi
  if ! grep -Fxq "$dir/" .gitignore; then
    echo "[missing] .gitignore rule for $dir/" >&2
    exit 1
  fi
done

echo "[ok] legacy freeze contract is in place"
for dir in "${frozen_dirs[@]}"; do
  echo "[frozen] $dir"
done

