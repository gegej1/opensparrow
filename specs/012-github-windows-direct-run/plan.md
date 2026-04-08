# Implementation Plan: GitHub Windows Direct-Run Runtime Closure

**Branch**: `012-github-windows-direct-run` | **Date**: 2026-04-08 | **Spec**: `specs/012-github-windows-direct-run/spec.md`

## Summary

本次实现把“GitHub 下载后 Windows 直接双击运行”落到三个具体层面：

1. 把 `vendor/windows-openclaw/` 纳入 Git 跟踪，让源码下载包自带 Windows runtime；
2. 为 repo-root 模式补一个根级 `one-click-deploy.cmd` 入口；
3. 修正 `install-local-feishu.ps1`，让它在 repo 模式下也能识别 `vendor/windows-openclaw/` 的真实布局。

## Technical Context

- **Repository root**: `/Users/eduardogan/Desktop/GHJProject/opensparrow`
- **Canonical Windows wrappers**: `platforms/windows/wrappers/`
- **Repo-mode runtime**: `vendor/windows-openclaw/`
- **Pack-mode runtime**: `runtime/`
- **Windows install logic**: `scripts/openclaw-usb/install-local-feishu.ps1`

## Design

### A. Git tracking boundary

- 把 `.gitignore` 从“整目录忽略 `vendor/`”调整为“默认忽略 `vendor/*`，只放行 `vendor/windows-openclaw/`”；
- 明确忽略顶层 `My_Skills/`，防止误把本机技能大包提交到 GitHub。

### B. Windows repo-root direct-run

- 新增根级 `one-click-deploy.cmd`，转发到 canonical `platforms/windows/wrappers/one-click-deploy.cmd`；
- 保持 `platforms/windows/wrappers/` 仍是单一真源，根级入口只做桥接。

### C. Runtime layout compatibility

- `scripts/openclaw-usb/install-local-feishu.ps1` 不再写死 `runtime/node/node.exe` 与 `runtime/openclaw/openclaw.mjs`；
- 改为按候选路径同时探测：
  - `runtime/node/node.exe` / `runtime/openclaw/openclaw.mjs`
  - `vendor/windows-openclaw/node.exe` / `vendor/windows-openclaw/node_modules/openclaw/openclaw.mjs`

## Validation Plan

1. `git check-ignore -v vendor/windows-openclaw/node.exe My_Skills`
2. `rg -n 'vendor/windows-openclaw|node_modules\\openclaw\\openclaw.mjs|one-click-deploy.cmd' .`
3. `./longrun/workspaces/opensparrow-unified/init.sh`
4. `git status --short`

## Deferred

- macOS / Linux runtime 是否也需要跟随源码仓入库
- 是否进一步裁剪 `vendor/windows-openclaw/` 的跨平台冗余内容
- Windows 实机双击回归与 ZIP 下载路径截图证据
