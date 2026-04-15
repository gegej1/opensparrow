# OpenClaw Model Routing Plugin Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把官方 `@blockrun/clawrouter` plugin 接进当前副本工作区，并提供一套可执行的本地 runtime / plugin / validation 管理入口。

**Architecture:** 通过兼容的 OpenClaw runtime 承载 plugin，避免再把“智能路由”伪装成单独三方 API 轮询。外围脚本负责 runtime 准备、plugin install/uninstall、gateway restart、状态检查和 CLI 验证；F-025 proxy 路线保留为备用。

**Tech Stack:** OpenClaw CLI、npm/pnpm runtime bootstrap、shell wrapper、mac `.command` wrapper、Node.js ESM。

---

## Task 1: 兼容 runtime

- [ ] 新增 runtime bootstrap 逻辑，确保能准备 `openclaw@2026.4.14`。
- [ ] 规避 `postinstall-bundled-plugins` 卡住的问题，固定使用 `OPENCLAW_DISABLE_BUNDLED_PLUGIN_POSTINSTALL=1`。
- [ ] 提供状态输出，显示当前使用的 OpenClaw 版本和入口路径。

## Task 2: Plugin 管理

- [ ] 新增 plugin 管理脚本，封装 `plugins install/list/inspect/doctor/uninstall`。
- [ ] 启用路径在 install 后执行 `gateway restart`。
- [ ] 关闭路径优先 `plugins uninstall clawrouter`，确保 cleanup hook 执行。

## Task 3: 本地入口

- [ ] 新增 shell 入口：`install/enable/disable/status/test`。
- [ ] 新增 mac `.command` 入口，供本地点击执行。
- [ ] 默认使用隔离 profile `model-routing-lab`，支持环境变量覆盖。

## Task 4: CLI 验证

- [ ] 用兼容 runtime 运行 `plugins list` / `inspect` / `doctor`。
- [ ] 验证默认模型切换到 `blockrun/auto`。
- [ ] 跑简单 / 复杂两类 prompt，记录路由行为或受限条件。

## Task 5: 文档与记忆层

- [ ] 新增 plugin runbook，说明开启/关闭、钱包限制、与 F-025 的分工。
- [ ] 更新 `feature_list.json` 新增 `F-026`。
- [ ] 更新 `claude-progress.txt` 记录 runtime 兼容性、plugin 接入、CLI 验证结果。
