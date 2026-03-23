# OpenSparrow Unified Source Repo

本目录现在作为 `OpenClaw/OpenSparrow` 的统一真源仓工作根。

## 当前真源结构

- `platforms/`：平台 companion 与 wrapper 模板
- `vendor/`：运行时二进制包（只读）
- `scripts/openclaw-usb/`：共享安装/收口脚本
- `ui/`：USB/UI 控制面
- `specs/`、`longrun/`、`.specify/`、`.codex/`：文档驱动与长期维护骨架
- `docs/`：对外说明、runbook 与迁移方案

## 先看哪里

- `docs/项目持久化说明.md:1`
- `docs/多平台统一仓方案-20260323.md:1`
- `longrun/workspaces/opensparrow-unified/app_spec.md:1`

## 当前边界

- `dist/` 为生成物输出目录，不直接维护
- `opensparrow_win/`、`_push_opensparrow_win/`、`openclaw-usb-feishu-delivery/`、`openclawtest/` 当前冻结为历史/实验目录
- 不强行统一入口脚本；统一的是共享逻辑、配置契约、验证链、构建/导出规则与容器化基线
