#!/usr/bin/env bash

set -euo pipefail

workspace_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
project_root="$(cd "${workspace_dir}/../../../.." && pwd)"
stage_dir="${project_root}/dist/usb-pack/openclaw-usb-pack"

rm -rf "$stage_dir"
mkdir -p "$stage_dir/docs" "$stage_dir/mac" "$stage_dir/windows" "$stage_dir/runbooks" "$stage_dir/scripts/openclaw-usb" "$stage_dir/skills/openclaw-local-feishu-usb" "$stage_dir/ui"

rsync -a --delete "${project_root}/scripts/openclaw-usb/" "$stage_dir/scripts/openclaw-usb/"
rsync -a --delete "${project_root}/skills/openclaw-local-feishu-usb/" "$stage_dir/skills/openclaw-local-feishu-usb/"
rsync -a --delete "${project_root}/docs/usb-pack/" "$stage_dir/docs/"
rsync -a --delete "${project_root}/docs/runbooks/" "$stage_dir/runbooks/"
rsync -a --delete "${project_root}/ui/" "$stage_dir/ui/"
cp "${project_root}/platforms/windows/wrappers/one-click-deploy.cmd" "$stage_dir/"
cp "${project_root}/platforms/windows/wrappers/one-click-deploy.ps1" "$stage_dir/"
cp "${project_root}/platforms/mac/wrappers/run-openclaw-usb.command" "$stage_dir/mac/"
cp "${project_root}/platforms/mac/wrappers/harden-openclaw-usb.command" "$stage_dir/mac/"
cp "${project_root}/platforms/windows/wrappers/run-openclaw-usb.cmd" "$stage_dir/windows/"
cp "${project_root}/platforms/windows/wrappers/harden-openclaw-usb.cmd" "$stage_dir/windows/"
cp "${project_root}/platforms/windows/wrappers/install-local-feishu.ps1" "$stage_dir/windows/"
cp "${project_root}/platforms/windows/wrappers/harden-local-feishu.ps1" "$stage_dir/windows/"
chmod +x "$stage_dir/mac/"*.command "$stage_dir/scripts/openclaw-usb/"*.sh

cat > "$stage_dir/README.txt" <<'README'
OpenClaw USB Portable Pack (Feishu-only)
========================================

1. 先看 docs/SOP.md、docs/isolation-boundary.md、docs/package-boundary.md
2. macOS: 双击 mac/run-openclaw-usb.command
3. Windows: 双击 windows/run-openclaw-usb.cmd
4. 若要复用历史 UI 配置（如 DingTalk / WeCom），Windows 可执行根目录 one-click-deploy.cmd / one-click-deploy.ps1
4. 验证完成后，用收口脚本把权限从 open 收回到 pairing/allowlist

说明：
- 本包只包含 OpenClaw + Feishu 本地/U盘部署资产。
- 本包不包含 Notion、VPS、群聊归档、知识检索等扩展内容。
- 本包不绕过 USB 自动执行限制，必须手动启动。
- 凭证只在目标机运行时输入，不预置在 U 盘文件中。
- 默认使用隔离 profile: usb-portable，默认端口: 18889。
- 若脱离仓库运行，安装日志与证据默认写入包内 `.openclaw-usb-runtime/`。
- Windows 入口为原生 PowerShell，不再依赖 Git Bash。
README

echo "[DONE] Built portable delivery pack at: $stage_dir"
