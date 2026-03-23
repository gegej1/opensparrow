#!/usr/bin/env bash

set -euo pipefail

readonly OPENCLAW_USB_FEATURE_SNAPSHOT_PATHS=(
  'AGENTS.md'
  '.specify/memory/constitution.md'
  'specs/002-openclaw-usb-installer'
  'specs/008-build-export-dist-closure'
  'docs/usb-pack'
  'docs/runbooks'
  'research/openclaw-usb-installer'
  'skills/openclaw-local-feishu-usb'
  'scripts/openclaw-usb'
  'platforms/mac/wrappers'
  'platforms/windows/wrappers'
  'ui'
  'longrun/workspaces/openclaw-usb-portable/app_spec.md'
  'longrun/workspaces/openclaw-usb-portable/feature_list.json'
  'longrun/workspaces/openclaw-usb-portable/init.sh'
  'longrun/workspaces/openclaw-usb-portable/claude-progress.txt'
  'longrun/workspaces/openclaw-usb-portable/execution/README.md'
  'longrun/workspaces/openclaw-usb-portable/execution/docs'
  'longrun/workspaces/openclaw-usb-portable/execution/runbooks'
  'longrun/workspaces/openclaw-usb-portable/execution/scripts'
)

usb_exec_workspace_dir() {
  cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd
}

usb_project_root() {
  local workspace_dir="$1"
  cd "${workspace_dir}/../../../.." && pwd
}

usb_prepare_export_root() {
  local export_root="$1"
  local archive_path="$2"
  rm -rf "$export_root" "$archive_path"
  mkdir -p "$(dirname "$export_root")" "$export_root"
}

usb_stage_pack_dir() {
  local workspace_dir="$1"
  local project_root
  project_root="$(usb_project_root "$workspace_dir")"
  printf '%s\n' "${project_root}/dist/usb-pack/openclaw-usb-pack"
}

usb_build_stage_pack() {
  local workspace_dir="$1"
  bash "${workspace_dir}/scripts/build-delivery-pack.sh"
}

usb_copy_stage_pack() {
  local workspace_dir="$1"
  local usb_pack_dir="$2"
  mkdir -p "$usb_pack_dir"
  cp -R "$(usb_stage_pack_dir "$workspace_dir")/." "$usb_pack_dir/"
}

usb_vendor_runtime_dir() {
  local project_root="$1"
  local platform="$2"

  case "$platform" in
    mac)
      printf '%s\n' "${project_root}/vendor/mac-openclaw"
      ;;
    windows)
      printf '%s\n' "${project_root}/vendor/windows-openclaw"
      ;;
    linux)
      printf '%s\n' "${project_root}/vendor/linux-openclaw"
      ;;
    *)
      echo "[ERROR] Unsupported vendor platform: $platform" >&2
      return 1
      ;;
  esac
}

usb_host_vendor_node_cmd() {
  local project_root="$1"

  case "$(uname -s)" in
    Darwin)
      printf '%s\n' "${project_root}/vendor/mac-openclaw/bin/node"
      ;;
    Linux)
      printf '%s\n' "${project_root}/vendor/linux-openclaw/bin/node"
      ;;
    *)
      echo "[ERROR] Unsupported host OS for vendor node version lookup: $(uname -s)" >&2
      return 1
      ;;
  esac
}

usb_vendor_node_version() {
  local project_root="$1"
  "$(usb_host_vendor_node_cmd "$project_root")" -p 'process.version' | sed 's/^v//'
}

usb_vendor_openclaw_version() {
  local project_root="$1"
  local openclaw_package_json="${project_root}/vendor/linux-openclaw/bin/node_modules/openclaw/package.json"

  if [[ ! -f "$openclaw_package_json" ]]; then
    openclaw_package_json="${project_root}/vendor/mac-openclaw/bin/node_modules/openclaw/package.json"
  fi

  sed -nE 's/.*"version": "([^"]+)".*/\1/p' "$openclaw_package_json" | head -n 1
}

usb_system_node_version() {
  if command -v node >/dev/null 2>&1; then
    node -v
  else
    printf '%s\n' 'not-installed'
  fi
}

usb_system_npm_version() {
  if command -v npm >/dev/null 2>&1; then
    npm -v
  else
    printf '%s\n' 'not-installed'
  fi
}

usb_sync_vendor_runtime() {
  local project_root="$1"
  local platform="$2"
  local runtime_dir="$3"
  local vendor_runtime_dir

  vendor_runtime_dir="$(usb_vendor_runtime_dir "$project_root" "$platform")"
  mkdir -p "${runtime_dir}/node" "${runtime_dir}/openclaw"

  case "$platform" in
    mac)
      rsync -a --delete "${vendor_runtime_dir}/" "${runtime_dir}/node/"
      rsync -a --delete \
        "${vendor_runtime_dir}/bin/node_modules/openclaw/" \
        "${runtime_dir}/openclaw/"
      ;;
    windows)
      rsync -a --delete "${vendor_runtime_dir}/" "${runtime_dir}/node/"
      rsync -a --delete \
        "${vendor_runtime_dir}/node_modules/openclaw/" \
        "${runtime_dir}/openclaw/"
      ;;
    linux)
      rsync -a --delete "${vendor_runtime_dir}/" "${runtime_dir}/node/"
      rsync -a --delete \
        "${vendor_runtime_dir}/bin/node_modules/openclaw/" \
        "${runtime_dir}/openclaw/"
      ;;
  esac
}

usb_copy_feature_snapshot() {
  local project_root="$1"
  local snapshot_root="$2"
  local relative_path

  for relative_path in "${OPENCLAW_USB_FEATURE_SNAPSHOT_PATHS[@]}"; do
    mkdir -p "${snapshot_root}/$(dirname "$relative_path")"
    rsync -a "${project_root}/${relative_path}" "${snapshot_root}/$(dirname "$relative_path")/"
  done
}

usb_prune_feature_snapshot() {
  local snapshot_root="$1"
  find "$snapshot_root" -type f -name '.env*' ! -name '.env.example' -delete
  rm -rf \
    "$snapshot_root/dist" \
    "$snapshot_root/longrun/workspaces/openclaw-usb-portable/execution/scripts/export" \
    "$snapshot_root/longrun/workspaces/openclaw-usb-portable/execution/evidence" \
    "$snapshot_root/longrun/workspaces/openclaw-usb-portable/execution/logs"
}

usb_write_checksums() {
  local export_root="$1"
  (
    cd "$export_root"
    find . -type f ! -name 'CHECKSUMS.sha256' -print0 | sort -z | xargs -0 shasum -a 256 > CHECKSUMS.sha256
  )
}

usb_write_versions_file() {
  local export_root="$1"
  local platform_key="$2"
  local platform_value="$3"
  local node_version="$4"
  local openclaw_version="$5"

  cat > "${export_root}/VERSIONS.txt" <<VERSIONS
bundle_scope=feishu-only-local-usb
${platform_key}=${platform_value}
bundled_node_version=v${node_version}
system_node_version=$(usb_system_node_version)
npm_version=$(usb_system_npm_version)
openclaw_version=${openclaw_version}
openclaw_runtime_source=vendor snapshot
usb_pack_dir=./usb-pack
feishu_source_dir=./feishu-source
VERSIONS
}
