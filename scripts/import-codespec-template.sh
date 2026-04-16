#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(CDPATH='' cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(CDPATH='' cd "$SCRIPT_DIR/.." && pwd)"
DEFAULT_SOURCE="/Users/eduardogan/Desktop/GHJProject/codeSPEC"
DEFAULT_TARGET="$REPO_ROOT/docs/reference/codeSPEC-template"

SOURCE_DIR="${1:-$DEFAULT_SOURCE}"
TARGET_DIR="${2:-$DEFAULT_TARGET}"
UPSTREAM_DIR="$TARGET_DIR/upstream"

SOURCE_UNIFIED_DIR="$SOURCE_DIR/UnifiedFramework"
SOURCE_AGENTTEAM_DIR="$SOURCE_DIR/AgentTeam"
TARGET_UNIFIED_DIR="$UPSTREAM_DIR/UnifiedFramework"
TARGET_AGENTTEAM_DIR="$UPSTREAM_DIR/AgentTeam"

readonly UNIFIED_FILES=(
  "README.md"
  "01-Unified-Framework-Architecture.md"
  "02-Pruning-Checklist.md"
  "03-Interface-Contracts.md"
  "04-New-Project-Integration-Flow.md"
  "05-Migration-Playbook.md"
  "06-Future-Extension-Policy.md"
  "12-Superpower-Execution-Bridge.md"
  "export-manifest.authoring.yaml"
)

readonly AGENTTEAM_FILES=(
  "README.md"
  "02-Project-Onboarding-SOP.md"
  "03-Dispatch-Templates.md"
  "04-Quick-Reference.md"
)

require_dir() {
  local dir_path="$1"
  if [ ! -d "$dir_path" ]; then
    echo "[import] missing source directory: $dir_path" >&2
    exit 1
  fi
}

require_file_list() {
  local base_dir="$1"
  shift
  local relative_path
  for relative_path in "$@"; do
    if [ ! -f "$base_dir/$relative_path" ]; then
      echo "[import] missing required source file: $base_dir/$relative_path" >&2
      exit 1
    fi
  done
}

copy_file_list() {
  local source_dir="$1"
  local target_dir="$2"
  shift 2
  local relative_path
  mkdir -p "$target_dir"
  for relative_path in "$@"; do
    cp "$source_dir/$relative_path" "$target_dir/$relative_path"
  done
}

if [ ! -d "$SOURCE_DIR" ]; then
  echo "[import] source repo not found: $SOURCE_DIR" >&2
  exit 1
fi

require_dir "$SOURCE_UNIFIED_DIR"
require_dir "$SOURCE_AGENTTEAM_DIR"
require_file_list "$SOURCE_UNIFIED_DIR" "${UNIFIED_FILES[@]}"
require_file_list "$SOURCE_AGENTTEAM_DIR" "${AGENTTEAM_FILES[@]}"

mkdir -p "$TARGET_DIR"
rm -rf "$UPSTREAM_DIR"
mkdir -p "$UPSTREAM_DIR"

copy_file_list "$SOURCE_UNIFIED_DIR" "$TARGET_UNIFIED_DIR" "${UNIFIED_FILES[@]}"
copy_file_list "$SOURCE_AGENTTEAM_DIR" "$TARGET_AGENTTEAM_DIR" "${AGENTTEAM_FILES[@]}"

{
  printf '# codeSPEC Import Manifest\n\n'
  printf -- '- Semantic source: `%s`\n' "$SOURCE_DIR"
  printf -- '- Target snapshot root: `%s`\n' "$UPSTREAM_DIR"
  printf -- '- Imported directories:\n'
  printf '  - `UnifiedFramework/` (%s files)\n' "${#UNIFIED_FILES[@]}"
  printf '  - `AgentTeam/` (%s files)\n' "${#AGENTTEAM_FILES[@]}"
  printf -- '- Imported files:\n'
  local_file=''
  for local_file in "${UNIFIED_FILES[@]}"; do
    printf '  - `UnifiedFramework/%s`\n' "$local_file"
  done
  for local_file in "${AGENTTEAM_FILES[@]}"; do
    printf '  - `AgentTeam/%s`\n' "$local_file"
  done
} > "$UPSTREAM_DIR/IMPORT_MANIFEST.md"

total_count=$(( ${#UNIFIED_FILES[@]} + ${#AGENTTEAM_FILES[@]} ))
echo "[import] synced ${total_count} curated files from $SOURCE_DIR to $UPSTREAM_DIR"
