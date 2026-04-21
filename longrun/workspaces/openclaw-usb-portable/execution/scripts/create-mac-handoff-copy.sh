#!/usr/bin/env bash

set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${script_dir}/lib/export-common.sh"

readonly REQUIRED_PACKAGED_RUNTIME_FILES=(
  'ui/server.mjs'
  'ui/install-helpers.mjs'
  'ui/lib/model-routing-config.mjs'
  'ui/lib/openai-provider.mjs'
  'scripts/model-routing/lib/custom-plugin-routing.mjs'
  'vendor/mac-openclaw/RUNTIME_TRUTH.json'
)

workspace_dir="$(usb_exec_workspace_dir)"
project_root="$(usb_project_root "$workspace_dir")"
version="$(tr -d '[:space:]' < "${project_root}/VERSION")"
arch="$(uname -m)"

case "$arch" in
  arm64) artifact_arch='arm64' ;;
  x86_64) artifact_arch='x64' ;;
  *) echo "[ERROR] Unsupported macOS arch: $arch" >&2; exit 1 ;;
esac

stage_dir="${project_root}/dist/usb-pack/opensparrow-${version}"
output_base="${GTCLAW_RELEASE_OUTPUT_DIR:-${project_root}/dist/handoff}"
export_root="${output_base}/gtclaw-mac-release-${artifact_arch}-$(date +%Y%m%d-%H%M%S)"
archive_path="${export_root}.zip"
artifact_dir="${export_root}/GTClaw-${version}-macOS-${artifact_arch}"
node_version="$(usb_vendor_node_version "$project_root")"
openclaw_version="$(usb_vendor_openclaw_version "$project_root")"

require_artifact_file() {
  local relative_path="$1"
  if [[ ! -f "${artifact_dir}/${relative_path}" ]]; then
    echo "[ERROR] Required packaged runtime dependency missing from artifact: ${relative_path}" >&2
    exit 1
  fi
}

mkdir -p "$output_base"

echo "[INFO] Building fresh Mac UI-first USB pack..."
bash "${project_root}/scripts/build-usb-pack.sh" --platform mac

if [[ ! -d "$stage_dir" ]]; then
  echo "[ERROR] Expected stage dir missing: $stage_dir" >&2
  exit 1
fi

usb_prepare_export_root "$export_root" "$archive_path"
mkdir -p "$artifact_dir"
rsync -a --delete "${stage_dir}/" "$artifact_dir/"
for relative_path in "${REQUIRED_PACKAGED_RUNTIME_FILES[@]}"; do
  require_artifact_file "$relative_path"
done

cat > "${export_root}/README-FIRST.txt" <<README
GTClaw macOS release
====================

本次导出只覆盖当前对外 macOS release cut：

- 唯一官方 first-click path：根目录 01-开始部署.command
- 今晚正式支持渠道：飞书、钉钉
- Dashboard 内含 GTClaw API 配置与模型智能路由
- 企业微信不纳入今晚 packaged outward promise
- mac/run-openclaw-usb.command 与 mac/harden-openclaw-usb.command 仅作为 advanced compatibility / handoff
- companion 不纳入今晚正式支持面

当前导出信息：
- version: ${version}
- macOS arch: ${artifact_arch}
- bundled Node: v${node_version}
- bundled OpenClaw: ${openclaw_version}
- default package state dir: .gtclaw-state/
- default package profile: gtclaw-portable

建议使用方式：
1. 进入 GTClaw-${version}-macOS-${artifact_arch}/
2. 双击 01-开始部署.command
3. 在浏览器安装向导中完成飞书 / 钉钉配置

README

usb_write_checksums "$export_root"

(
  cd "$(dirname "$export_root")"
  if command -v ditto >/dev/null 2>&1; then
    ditto -c -k --sequesterRsrc --keepParent "$(basename "$export_root")" "$(basename "$archive_path")"
  else
    zip -qry "$(basename "$archive_path")" "$(basename "$export_root")"
  fi
)

echo "[DONE] macOS release folder created: $export_root"
echo "[DONE] Archive created: $archive_path"
echo "[INFO] Packaged artifact dir: $artifact_dir"
