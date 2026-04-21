# OpenSparrow Unified Source Repo

![Version](https://img.shields.io/badge/version-0.1.0--alpha-2f81f7)
![Status](https://img.shields.io/badge/status-M3%20%E5%8F%AF%E4%BA%A4%E4%BB%98-f59e0b)

本目录现在作为 `OpenClaw/OpenSparrow` 的统一真源仓工作根。

当前版本：`0.1.0-alpha`（见 `VERSION`）

## 项目是什么

这是一个把 `OpenClaw/OpenSparrow` 多平台资产收敛到单仓真源的工程仓。当前仓库同时承载：

- `vendor/` 运行时分发包
- macOS / Windows / Linux wrapper 与 companion 源文件
- 本地 UI 控制面与安装向导
- USB / 本地安装与 hardening 脚本
- `specs/ + longrun/` 的文档驱动交付与项目记忆层
- Docker baseline

它不是单纯的 Web 应用，也不是单一 npm 项目；运行面主要由 **Node.js ESM + Bash / `.command` + PowerShell + vendor runtime** 组成。

## 快速开始

- 非技术用户安装指南：`docs/usb-pack/INSTALL.md`
- 项目持久化说明：`docs/项目持久化说明.md`
- 多平台统一仓方案：`docs/多平台统一仓方案-20260323.md`
- unified workspace 规格：`longrun/workspaces/opensparrow-unified/app_spec.md`
- 当前开发框架治理入口：`docs/governance/README.md`
- `codeSPEC` 清洗模板参考：`docs/reference/codeSPEC-template/README.md`
- 架构概览：`docs/architecture-overview.md`
- 运行链路：`docs/runtime-flow.md`
- 当前状态：`docs/current-status.md`

## 技术栈

- Runtime: vendor-bundled OpenClaw + Node.js
- Backend/control plane: `ui/server.mjs`（Node.js ESM，无额外框架）
- Frontend: HTML + Alpine.js + Tailwind CDN
- Shared automation: Bash / `.command` / PowerShell
- Packaging: `scripts/build-usb-pack.sh` + handoff/export scripts
- Project delivery/memory: `specs/` + `longrun/`
- Container baseline: `deploy/docker/`

## 当前真源结构

- `platforms/`：平台 companion 与 wrapper 模板
- `vendor/`：运行时二进制包（只读）
- `scripts/openclaw-usb/`：共享安装/收口脚本
- `ui/`：USB/UI 控制面
- `specs/`、`longrun/`、`.specify/`、`.codex/`：文档驱动与长期维护骨架
- `docs/`：对外说明、runbook、迁移方案与 reference 模板镜像

## 面向用户的交付入口

- macOS：双击 `01-开始部署.command`
- Windows：双击 `one-click-deploy.cmd`
- 浏览器安装向导：默认自动打开 `http://localhost:19000`

## 开发入口

- root repo 本地 dashboard：`bash scripts/run-root-dashboard.sh`
- UI server 直起：`node ui/server.mjs`
- workspace 合同检查：`./longrun/workspaces/opensparrow-unified/init.sh`
- Docker baseline：见 `deploy/docker/README.md`

## 测试与验证

本仓没有单一 `package.json` 驱动的统一测试入口；常用验证链如下：

- 项目合同检查：`./longrun/workspaces/opensparrow-unified/init.sh`
- Shell 语法：`bash -n scripts/openclaw-usb/*.sh`
- UI / server 语法：`node --check ui/server.mjs`
- 关键 Node tests：
  - `node --test ui/tests/model-routing-endpoints.test.mjs`
  - `node --test ui/tests/model-routing-live-router.test.mjs`
  - `node --test ui/tests/dashboard-status-shell.test.mjs`
  - `node --test ui/public/replay-surfaces.test.mjs`

## 当前关键模块

- `ui/server.mjs`
  - 安装向导、Dashboard、`/api/install`、`/api/status`
  - runtime / profile / plugin 调度
  - model routing local sidecar
- `ui/lib/model-routing-config.mjs`
  - smart routing 配置读写与 profile 持久化
- `scripts/model-routing/lib/custom-plugin-routing.mjs`
  - 自定义路由 provider contract
- `scripts/openclaw-usb/`
  - 共享安装 / hardening 真源
- `platforms/mac/wrappers/01-开始部署.command`
  - macOS packaged first-click 入口
- `longrun/workspaces/opensparrow-unified/`
  - 当前项目 authority 之下的长期事实与会话进度

## 当前主要问题

- mac bundled runtime 仍存在 `bin/lib` 双版本分叉：
  - `bin/node_modules/openclaw` = `2026.3.12`
  - `lib/node_modules/openclaw` = `2026.3.23`
  - 当前 packaged mac WeCom 安装会命中旧版本
- 当前工作树是 noisy workspace，存在多条 packet 的已跟踪/未跟踪改动；提交前必须做 packet attribution
- GitHub 仓库默认不包含 `vendor/` 二进制 runtime，因此仅靠 GitHub 不能完整复现 packaged/runtime 问题，需要结合本地补充审查包
- packaged WeCom 不能写 PASS；当前仍处于 runtime upgrade / packaged closure 前的 blocker 状态

## 当前边界

- `dist/` 为生成物输出目录，不直接维护
- `opensparrow_win/`、`_push_opensparrow_win/`、`openclaw-usb-feishu-delivery/`、`openclawtest/` 当前冻结为历史/实验目录
- 不强行统一入口脚本；统一的是共享逻辑、配置契约、验证链、构建/导出规则与容器化基线
- `docs/governance/` 是当前仓正在使用的治理与派工底层
- `docs/reference/codeSPEC-template/` 是上游参考镜像层，不是当前仓的权威规则层

## 读仓建议

建议优先阅读：

1. `AGENTS.md`
2. `docs/governance/framework-stack.md`
3. `docs/architecture-overview.md`
4. `docs/runtime-flow.md`
5. `docs/current-status.md`
6. `longrun/workspaces/opensparrow-unified/feature_list.json`
7. `longrun/workspaces/opensparrow-unified/claude-progress.txt`
