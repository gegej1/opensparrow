#!/usr/bin/env bash

set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${script_dir}/lib/export-common.sh"

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
export_root="${project_root}/dist/handoff/opensparrow-mac-ui-full-${artifact_arch}-$(date +%Y%m%d-%H%M%S)"
archive_path="${export_root}.zip"
artifact_dir="${export_root}/opensparrow-${version}-mac-ui-${artifact_arch}"
node_version="$(usb_vendor_node_version "$project_root")"
openclaw_version="$(usb_vendor_openclaw_version "$project_root")"

mkdir -p "${project_root}/dist/handoff"

echo "[INFO] Building fresh Mac UI-first USB pack..."
bash "${project_root}/scripts/build-usb-pack.sh" --platform mac

if [[ ! -d "$stage_dir" ]]; then
  echo "[ERROR] Expected stage dir missing: $stage_dir" >&2
  exit 1
fi

usb_prepare_export_root "$export_root" "$archive_path"
mkdir -p "$artifact_dir"
rsync -a --delete "${stage_dir}/" "$artifact_dir/"

cat > "${export_root}/README-FIRST.txt" <<README
OpenSparrow Mac UI-first packaged release
=========================================

本次导出只覆盖今晚的 Mac UI-first 首发 cut：

- 唯一官方 first-click path：根目录 01-开始部署.command
- 今晚正式支持渠道：飞书、钉钉
- 企业微信不纳入今晚 packaged outward promise
- mac/run-openclaw-usb.command 与 mac/harden-openclaw-usb.command 仅作为 advanced compatibility / handoff
- companion 不纳入今晚正式支持面

当前导出信息：
- version: ${version}
- macOS arch: ${artifact_arch}
- bundled Node: v${node_version}
- bundled OpenClaw: ${openclaw_version}

建议使用方式：
1. 进入 opensparrow-${version}-mac-ui-${artifact_arch}/
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

echo "[DONE] Mac UI-first candidate created: $export_root"
echo "[DONE] Archive created: $archive_path"
echo "[INFO] Packaged artifact dir: $artifact_dir"
