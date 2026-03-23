# Implementation Plan: Build / Export Dist Closure

**Branch**: `008-build-export-dist-closure` | **Date**: 2026-03-23 | **Spec**: `specs/008-build-export-dist-closure/spec.md`

## Summary

本次实现把 W-002 从“路径审查”推进为“build/export 真正收口”：

1. 把 staging / handoff 输出从 workspace 历史目录迁到根级 `dist/`；
2. 把交付包组装源统一切换到 canonical 根路径；
3. 把 bundled runtime 切换为仓内 `vendor/`，去掉对本机全局安装与在线下载的依赖；
4. 同步文档、runbook、feature list 与 handoff 记录。

## Technical Context

- **Repository root**: `/Users/eduardogan/Desktop/GHJProject/opensparrow`
- **Build/export scripts**: `longrun/workspaces/openclaw-usb-portable/execution/scripts/`
- **Canonical wrappers**: `platforms/mac/wrappers/`, `platforms/windows/wrappers/`
- **Canonical runtime**: `vendor/mac-openclaw/`, `vendor/windows-openclaw/`
- **Canonical docs**: `docs/usb-pack/`, `docs/runbooks/`

## Design

### A. Output convergence

- staging 包统一输出到 `dist/usb-pack/openclaw-usb-pack/`；
- Mac / Windows handoff copy 统一输出到 `dist/handoff/`；
- `execution/` 只保留编排脚本、调查文档、runbook 与 handoff 记录，不再承接生成物主落点。

### B. Canonical source convergence

- `build-delivery-pack.sh` 从根级 canonical docs / runbooks / wrappers / scripts 组包；
- Windows 包内 `.ps1` 启动桥接脚本补到 `platforms/windows/wrappers/`，避免依赖消失的 `execution/delivery-pack/windows/`；
- feature snapshot 补入根级 `docs/usb-pack/`、`docs/runbooks/`、`platforms/*/wrappers/`、`ui/` 与本次 spec。

### C. Vendor runtime convergence

- Mac 导出直接复制 `vendor/mac-openclaw/` 到 `runtime/node/`，并同步 `openclaw` 包到 `runtime/openclaw/`；
- Windows 导出直接复制 `vendor/windows-openclaw/` 到 `runtime/node/`，并同步 `openclaw` 包到 `runtime/openclaw/`；
- 版本文件改为记录 `vendor snapshot`，不再宣称来源是 `npm-global snapshot`。

## Validation Plan

1. `bash -n longrun/workspaces/openclaw-usb-portable/execution/scripts/*.sh`
2. `bash -n longrun/workspaces/openclaw-usb-portable/execution/scripts/lib/*.sh`
3. `bash longrun/workspaces/openclaw-usb-portable/execution/scripts/build-delivery-pack.sh`
4. `find dist/usb-pack/openclaw-usb-pack -maxdepth 3 -type f | sort`
5. `./longrun/workspaces/opensparrow-unified/init.sh`
6. `./longrun/workspaces/openclaw-usb-portable/init.sh`

## Deferred

- 真正的 release / archive 物理搬运策略
- native wrapper 更进一步的薄化
- Windows 实机 dry-run / PowerShell 语法解析
