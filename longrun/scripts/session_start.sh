#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "$0")" && pwd)"
workspace_dir="${1:-.}"

cd "$workspace_dir"

echo "[1/7] pwd"
pwd

echo

echo "[2/7] ls -la"
ls -la

echo

echo "[3/7] app_spec.md"
if [ -f app_spec.md ]; then
  head -n 80 app_spec.md
else
  echo "app_spec.md not found"
fi

echo

echo "[4/7] feature_list.json (head)"
if [ -f feature_list.json ]; then
  head -n 80 feature_list.json
else
  echo "feature_list.json not found"
fi

echo

echo "[5/7] claude-progress.txt"
if [ -f claude-progress.txt ]; then
  cat claude-progress.txt
else
  echo "claude-progress.txt not found"
fi

echo

echo "[6/7] git log --oneline -20"
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git log --oneline -20
else
  echo "No git repository found in this workspace."
fi

echo

echo "[7/7] progress report"
if [ -f feature_list.json ]; then
  python3 "$script_dir/progress_report.py" feature_list.json 5
else
  echo "feature_list.json not found"
fi
