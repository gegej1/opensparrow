# Custom OpenClaw Model Routing Plugin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 基于官方 ClawRouter 路由逻辑，做一份消费自定义 OpenAI-compatible 上游的 OpenClaw custom plugin，并在本地跑通双终端演示。

**Architecture:** 保留 OpenClaw plugin 装载链路与 tier 路由内核，替换官方 wallet/x402 执行层为自定义 OpenAI-compatible 请求层。外围脚本负责 plugin stage/install、lab 配置、双终端启动和状态验证。

**Tech Stack:** OpenClaw plugin、Node.js ESM、OpenAI-compatible chat completions、shell wrapper、mac Terminal demo。

---

## Task 1: Custom plugin 源码骨架

- [ ] 新增 repo-local custom plugin 目录与 manifest。
- [ ] 固定最小配置 schema：`baseUrl`、`apiKey`、`tierModelMap`、`routing`。
- [ ] 明确 plugin 入口文件与安装/stage 位置。

## Task 2: 路由与上游执行层

- [ ] 复用官方 route / routing config 能力，落到 repo-local helper。
- [ ] 实现 prompt 提取、tier 选择、tier -> model 映射。
- [ ] 实现自定义 OpenAI-compatible `/v1/chat/completions` 调用。
- [ ] 修好中文 prompt 的 header/log 安全边界。

## Task 3: OpenClaw lab 接入

- [ ] 扩展现有 plugin 管理脚本，支持 stage/enable/disable/status custom plugin。
- [ ] 切换默认模型到 custom plugin provider / auto model。
- [ ] 保证不污染真实 `HOME`，继续使用 repo-local `dist/model-running-lab/`。

## Task 4: 双终端演示

- [ ] 新增真 plugin 双终端启动脚本。
- [ ] 终端 A 输出 tier / selected model / provider model。
- [ ] 终端 B 支持自然语言输入，不要求用户输入 `/simple` 等预设命令。

## Task 5: 文档与记忆层

- [ ] 新增 `F-027` runbook。
- [ ] 更新 `feature_list.json` 与 `claude-progress.txt`。
- [ ] 记录新 GitHub 仓库地址与后续 push 方式。
