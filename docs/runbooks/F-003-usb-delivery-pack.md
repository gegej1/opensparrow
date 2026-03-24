# F-003 Runbook - U 盘交付包

## 元数据
- 日期：`2026-03-23`
- 作者/Agent：`Codex-B`
- 关联 spec：`specs/002-openclaw-usb-installer/spec.md`；`specs/008-build-export-dist-closure/spec.md`

## 概述
- 组装一个可拷贝到 U 盘的独立目录，包含 macOS / Windows 手动入口、脚本、文档和 runbook。
- 本文聚焦 staging 包的组装命令、输出目录和验收点。

## 前置条件
- 当前位于仓库根目录 `/Users/eduardogan/Desktop/GHJProject/opensparrow`。
- canonical 组包源应位于 `docs/usb-pack/`、`docs/runbooks/`、`platforms/*/wrappers/`、`scripts/openclaw-usb/`。
- 导出输出目录应写入根级 `dist/`，不从 frozen 目录取真源。

## 操作步骤
1. 生成 staging 包

   ```bash
   bash longrun/workspaces/openclaw-usb-portable/execution/scripts/build-delivery-pack.sh
   ```

   - 默认输出：`dist/usb-pack/openclaw-usb-pack/`。
   - 当前组包来源：`docs/usb-pack/`、`docs/runbooks/`、`platforms/*/wrappers/`、`scripts/openclaw-usb/`。

2. 检查导出目录结构

   ```bash
   find dist/usb-pack/openclaw-usb-pack -maxdepth 3 | sort
   ```

   - 重点检查交付包目录中是否包含平台入口、说明文档、runbook、脚本和 UI 资产。

## 验证方法
- staging 包目录完整。
- macOS 存在 `.command` 入口。
- Windows 存在 `.cmd` + `.ps1` 入口。
- `README.txt` 与 `SOP` 一致。

## 故障排查
- `dist/usb-pack/openclaw-usb-pack/` 未生成：先检查 build 脚本是否成功执行，以及 canonical 源目录是否齐全。
- 平台入口缺失：优先核对 `platforms/mac/wrappers/` 与 `platforms/windows/wrappers/` 中对应文件是否存在。
- 文档与交付包不一致：重新核对 `docs/usb-pack/` 与 `docs/runbooks/` 的当前版本，再重新组包。

## 参考资料
- `specs/002-openclaw-usb-installer/spec.md`
- `specs/008-build-export-dist-closure/spec.md`
- `docs/usb-pack/SOP.md`
- `docs/usb-pack/solution-architecture.md`
