# Feature Specification: Custom OpenClaw Model Routing Plugin

**Feature ID**: `F-027`  
**Feature Branch**: `027-custom-model-routing-plugin`  
**Created**: 2026-04-15  
**Status**: In Progress  
**Input**: 用户明确要求：不必坚持官方 BlockRun wallet / x402 计费链路；目标是基于官方 `ClawRouter` 路由逻辑做一份我们自己的 OpenClaw plugin，真实挂进 OpenClaw，并改走自定义 OpenAI-compatible `baseUrl + apiKey + tierModelMap`。

## Context & References

- `AGENTS.md`
- `docs/项目持久化说明.md`
- `docs/governance/README.md`
- `docs/governance/framework-stack.md`
- `.specify/memory/constitution.md`
- `longrun/workspaces/opensparrow-unified/feature_list.json`
- `longrun/workspaces/opensparrow-unified/claude-progress.txt`
- `specs/025-openclaw-model-routing-proxy/`
- `specs/026-openclaw-model-routing-plugin/`
- `docs/runbooks/F-025-model-routing-proxy.md`
- `docs/runbooks/F-026-model-routing-plugin.md`
- 新仓库：`https://github.com/gegej1/opensparrow-custom-routing-plugin`

## 已确认前提

1. `F-025` 已证明：用户给定的 OpenAI-compatible `URL + API Key` 可以真实完成多模型调用与 tier 映射。
2. `F-026` 已证明：`OpenClaw 2026.4.14` 可以真实加载 plugin，并把默认模型切到 plugin provider。
3. 官方 `@blockrun/clawrouter` 路线默认绑定 BlockRun wallet / x402；它不会直接使用用户给定的 `URL + API Key`。
4. 用户不关心是否“官方原包”，只关心**真实挂进 OpenClaw 的模型智能路由结果**。
5. 本轮仍只做**模型智能路由**，不做 Agent routing，不扩到渠道绑定。

## Goal

在当前副本工作区和新 GitHub 仓库中，产出一套 **自定义 OpenClaw 模型智能路由 plugin**：

`OpenClaw -> custom routing plugin -> route() / tier decision -> user OpenAI-compatible upstream`

并提供可执行的双终端本地演示：

- 终端 A：OpenClaw/plugin 路由日志
- 终端 B：正常自然语言输入
- 插件根据任务复杂度自动选择不同模型

## In Scope

1. 新建一份 repo-local custom plugin 源码。
2. 保留 / 复用官方 ClawRouter 的 tier 判定思路与默认 routing config。
3. 移除 BlockRun wallet、x402、partner tools、wallet 提示等支付耦合。
4. 改为通过插件配置消费：
   - `baseUrl`
   - `apiKey`
   - `tierModelMap`
   - 可选 `routing` 覆盖
5. 让 plugin 真实挂进 OpenClaw lab runtime，并把默认模型切到自定义 provider。
6. 提供 enable / disable / status / test / 双终端演示脚本。
7. 同步 runbook、spec、longrun。

## Out of Scope

- BlockRun wallet / x402 支付链路
- BlockRun MCP / web search / partner tools
- Agent routing
- 渠道绑定（Feishu / WeCom / Slack / 群聊）
- Dashboard UI 大改
- Windows / Linux 适配
- 修改 `vendor/` 二进制

## Design

### 1. Plugin 形态

- 新插件以 **OpenClaw plugin** 方式加载，而不是外挂 proxy 作为主链路。
- 插件源码落在 repo 内独立目录，优先放在：
  - `scripts/model-routing/custom-plugin/`
- 插件输出包含：
  - `package.json`
  - `openclaw.plugin.json`
  - `src/` 或直接入口 JS

### 2. 路由内核

- 优先复用官方 `ClawRouter` 的：
  - `route()`
  - `DEFAULT_ROUTING_CONFIG`
  - tier / confidence / reasoning 决策逻辑
- 允许最小必要 patch：
  - 去掉与钱包/x402 强耦合的执行层
  - 保留 debug header/log，但必须保证对中文 prompt 是 ASCII-safe

### 3. 执行层

- 插件收到 `blockrun/auto` 或自定义 `auto` 模型请求后：
  1. 提取 user prompt
  2. 调用 routing 内核拿到 `SIMPLE / MEDIUM / COMPLEX / REASONING`
  3. 按 `tierModelMap` 选择上游模型
  4. 用用户的 `baseUrl + apiKey` 调 OpenAI-compatible `/v1/chat/completions`
  5. 把真实结果回给 OpenClaw
- 中文 prompt 下的 header/log 必须稳定，不得再触发非法 header 502。

### 4. 配置模型

插件配置至少支持：

- `baseUrl`: OpenAI-compatible base URL
- `apiKey`: 上游 API Key
- `tierModelMap.SIMPLE`
- `tierModelMap.MEDIUM`
- `tierModelMap.COMPLEX`
- `tierModelMap.REASONING`
- `routing`: 可选 routing config override

默认模型映射先沿用现有 DMX demo：

- `SIMPLE -> gemini-2.0-flash-ssvip`
- `MEDIUM -> kimi-k2-0711-preview`
- `COMPLEX -> deepseek-r1-250528`
- `REASONING -> deepseek-r1-250528`

### 5. 本地验证

- 第一层：plugin 能被 OpenClaw 真实加载
- 第二层：默认模型切到 custom plugin provider
- 第三层：双终端演示时，正常自然语言能打出不同 tier
- 第四层：实际 provider model 与 tier 对应关系可见

### 6. 回退策略

- 若 custom plugin 临时不可用，保留 `F-025` 作为备用演示链路。
- 但本轮主链路是 **OpenClaw 内的 custom plugin**，不再把外部 proxy 误称为 plugin。

## Functional Requirements

- FR-001: 系统 MUST 提供一份 repo-local custom OpenClaw plugin 源码。
- FR-002: plugin MUST 支持用户自定义 `baseUrl + apiKey + tierModelMap`。
- FR-003: plugin MUST 真实挂进 OpenClaw，并把默认模型切到 plugin provider。
- FR-004: plugin MUST 基于任务复杂度自动选择不同模型，而不是静态固定一个模型。
- FR-005: plugin MUST 对中文 prompt 稳定工作，不得因 header/log 非 ASCII 字符导致失败。
- FR-006: 系统 MUST 提供双终端演示脚本，并且终端 B 支持正常自然语言输入。
- FR-007: 文档 MUST 明确区分：本方案是“基于官方路由逻辑改造的自定义 plugin”，不是原样官方钱包 plugin。

## Success Criteria

1. 新 GitHub 仓库已建立，并作为本轮 custom plugin 的专用远端。
2. 自定义 plugin 能在 `OpenClaw 2026.4.14` lab 中真实加载。
3. 终端 A / B 双终端演示可用，且输入正常自然语言能触发不同 tier。
4. 插件实际请求走用户给定的 OpenAI-compatible 上游，而不是 BlockRun wallet。
5. runbook、spec、longrun 已同步，后续可以继续在新 repo 上迭代。
