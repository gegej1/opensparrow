# Implementation Plan: OpenSparrow Root Unification Execution

**Branch**: `006-opensparrow-root-unification` | **Date**: 2026-03-23 | **Spec**: `specs/006-opensparrow-root-unification/spec.md`

## Summary

本特性把“统一真源仓”的执行基座正式放到 `opensparrow/` 根目录，而不是继续停留在 `openclawNative/` 或 `opensparrow_win/feishu-source/` 的双根工作状态。

本次不是纯规划，而是执行第一阶段：

1. 迁入并合并 `openclawNative` 的 long-term/spec 骨架；
2. 迁入 `feishu-source` 的 source-of-truth 资产；
3. 写入新的统一仓规则文件与方案文档；
4. 创建新的 `opensparrow-unified` workspace；
5. 直接完成 git/bootstrap 与验证；
6. 把容器化保留在下一阶段。

## Technical Context

**Repository Root**: `/Users/eduardogan/Desktop/GHJProject/opensparrow`  
**Imported Contexts**: `openclawNative/`, `opensparrow_win/feishu-source/`  
**Primary Assets**: `platforms/`, `vendor/`, `scripts/openclaw-usb/`, `ui/`, `docs/`, `specs/`, `longrun/`, `.specify/`, `.codex/`  
**Validation**: workspace init + `bash -n` + root file existence + git bootstrap  
**Deferred**: `deploy/docker/` 真正容器实现

## Decision Notes

### 1. 为什么这次选 `opensparrow/` 根目录

- 用户已明确要求切换到该目录；
- 它包住所有 legacy 目录，便于冻结与后续归档；
- 它尚未初始化 git，方便干净落 `.gitattributes` 与 `.gitignore`；
- 可同时承载 runtime/source、USB/Feishu source、UI 与后续容器化资产。

### 2. 如何兼容之前“推荐改造 openclawNative”的结论

前一版迁移矩阵推荐改造 `openclawNative/`，原因是它当时是更干净的候选基座。当前用户已明确把工作根改到 `opensparrow/`，因此本计划是在不推翻原风险模型的前提下，把“基座目录”替换成 `opensparrow/` 根目录：

- 风险模型不变；
- 目录角色划分不变；
- 迁移顺序不变；
- 只是把最终承载位置改成根目录。

## Proposed Design

### A. Root Canonical Structure

```text
opensparrow/
├── platforms/
├── vendor/
├── scripts/openclaw-usb/
├── ui/
├── docs/
├── specs/
├── longrun/
├── .specify/
├── .codex/
├── deploy/docker/
└── dist/
```

### B. Context Merge Strategy

- 以 `openclawNative` 为 longrun/.specify/.codex 的骨架来源；
- 以 `feishu-source` 为 `specs/`、`scripts/openclaw-usb/`、`skills/`、`research/`、`openclaw-usb-portable workspace` 的来源；
- 新建 `opensparrow-unified` 作为主 workspace；
- 保留并适配 `openclaw-native` 与 `openclaw-usb-portable` 两个 legacy workspace。

### C. Boundary Freeze

- `platforms/`、`scripts/`、`ui/`、`docs/`、`specs/`、`longrun/`、`.specify/`、`.codex/`：真源
- `vendor/`：只读 vendor
- `dist/`：生成物
- `opensparrow_win/`、`_push_opensparrow_win/`、`openclaw-usb-feishu-delivery/`、`openclawtest/`：冻结目录

### D. Git / Line Ending Strategy

- 根级 `git init`
- 根级 `.gitattributes`
- 根级 `.gitignore`
- 不把 legacy 目录纳入新根仓追踪范围

### E. Execution Scope for This Session

- 已执行目录迁入与结构收口
- 本次补齐规则、spec、workspace、git/bootstrap、wrapper 回退路径与验证
- 不在本次实现 Docker baseline

## Risk Handling

### 完全可控风险

- CRLF/LF、权限位、二进制属性、脚本共存、路径分隔符、CI 矩阵、Docker 权限与挂载、npm optionalDependencies、USB 文件系统限制

### 部分可控风险

- Docker host networking、Windows 长路径、exFAT 无日志、Docker Synchronized File Shares 差异

### 本次额外风险

- legacy 目录中可能还有漏迁真源：通过冻结而非立即删除规避
- wrapper 复制到新路径后相对路径失效：通过 fallback 路径修正规避
- root git 与 nested repo 冲突：通过 `.gitignore` 冻结 legacy 目录规避

## Validation Plan

1. 运行 `./longrun/workspaces/opensparrow-unified/init.sh`
2. 运行 `./longrun/workspaces/openclaw-native/init.sh`
3. 运行 `./longrun/workspaces/openclaw-usb-portable/init.sh`
4. 运行 `bash -n scripts/openclaw-usb/*.sh`
5. 运行 `bash -n platforms/linux/companion/*.sh`
6. 运行 `bash -n platforms/mac/companion/*`
7. 运行 `bash -n platforms/mac/wrappers/*.command`
8. 检查 `git status --short`

## Next Phase

统一仓第一阶段稳定后，继续进入：

1. legacy 快照归档；
2. wrapper / build/export 收口；
3. `deploy/docker/` 容器化基线；
4. Feishu / WeCom / DingTalk 容器与原生双回归。
