# OpenClaw Model Routing Proxy Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用最小侵入方式把 `ClawRouter standalone/proxy` 接进当前 OpenClaw 副本，并提供可执行的 enable / disable / status 入口。

**Architecture:** 保留现有 `openai` provider，不碰 `vendor/`。新增 profile-local `clawrouter` provider、独立 auth profile、profile-local runtime/state/log 目录；由外围脚本负责代理安装、启动、配置切换和恢复。

**Tech Stack:** Node.js ESM、bundled OpenClaw runtime、shell wrapper、mac `.command` wrapper、node:test。

---

## Task 1: 纯逻辑与测试骨架

- [ ] 新增 `scripts/tests/model-routing.test.mjs`，先锁定 provider config、fallback merge、auth merge/remove 预期。
- [ ] 新增 `scripts/model-routing/lib/model-routing.mjs`，提供 `buildClawRouterProviderConfig()`、`mergeFallbacksForEnable()`、`mergeProviderAuth()`、`stripProviderAuth()` 等纯函数。

## Task 2: 管理脚本

- [ ] 新增 `scripts/model-routing/manage-clawrouter.mjs`，实现 `enable` / `disable` / `status` / `start-proxy` / `stop-proxy`。
- [ ] 运行时目录固定在 `~/.openclaw-<profile>/model-routing/`，写入 state、pid、log、runtime。
- [ ] 启用路径负责：安装或复用 ClawRouter、写 provider/auth、切 primary、保留并增强 fallback、落 state。
- [ ] 关闭路径负责：恢复启用前 primary/fallback/auth/provider，并在本脚本拥有 proxy 时停止它。

## Task 3: Shell 与 mac 入口

- [ ] 新增 `scripts/model-routing/{enable,disable,status}-clawrouter.sh`。
- [ ] 新增 `platforms/mac/wrappers/02-开启模型智能路由.command`。
- [ ] 新增 `platforms/mac/wrappers/03-关闭模型智能路由.command`。
- [ ] 新增 `platforms/mac/wrappers/04-检查模型智能路由.command`。

## Task 4: 文档与记忆层

- [ ] 新增 `docs/runbooks/F-025-model-routing-proxy.md`，记录最短使用链路与回退策略。
- [ ] 更新 `longrun/workspaces/opensparrow-unified/feature_list.json`，新增 `F-025`。
- [ ] 更新 `longrun/workspaces/opensparrow-unified/claude-progress.txt`，记录本轮验证与已知边界。

## Task 5: 验证

- [ ] `node --test scripts/tests/model-routing.test.mjs`
- [ ] `node --check scripts/model-routing/manage-clawrouter.mjs`
- [ ] `bash -n scripts/model-routing/enable-clawrouter.sh`
- [ ] `bash -n scripts/model-routing/disable-clawrouter.sh`
- [ ] `bash -n scripts/model-routing/status-clawrouter.sh`
- [ ] 以临时 profile 真实跑一轮 enable → status → disable，确认配置切换与恢复可工作。
