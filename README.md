# OpenSparrow Unified Source Repo

![Version](https://img.shields.io/badge/version-1.0.0-2f81f7)
![Status](https://img.shields.io/badge/status-M3%20%E5%8F%AF%E4%BA%A4%E4%BB%98-f59e0b)

本目录现在作为 `OpenClaw/OpenSparrow` 的统一真源仓工作根。

当前版本：`1.0.0`（见 `VERSION`）

## 快速开始

- 非技术用户安装指南：`docs/usb-pack/INSTALL.md`
- 项目持久化说明：`docs/项目持久化说明.md`
- 多平台统一仓方案：`docs/多平台统一仓方案-20260323.md`
- unified workspace 规格：`longrun/workspaces/opensparrow-unified/app_spec.md`

## 当前真源结构

- `platforms/`：平台 companion 与 wrapper 模板
- `vendor/`：运行时二进制包（只读）
- `scripts/openclaw-usb/`：共享安装/收口脚本
- `ui/`：USB/UI 控制面
- `specs/`、`longrun/`、`.specify/`、`.codex/`：文档驱动与长期维护骨架
- `docs/`：对外说明、runbook 与迁移方案

## 面向用户的交付入口

- macOS：双击 `01-开始部署.command`
- Windows：双击 `one-click-deploy.cmd`
- 浏览器安装向导：默认自动打开 `http://localhost:19000`

## 当前边界

- `dist/` 为生成物输出目录，不直接维护
- `opensparrow_win/`、`_push_opensparrow_win/`、`openclaw-usb-feishu-delivery/`、`openclawtest/` 当前冻结为历史/实验目录
- 不强行统一入口脚本；统一的是共享逻辑、配置契约、验证链、构建/导出规则与容器化基线
