# Feature Specification: OpenClaw Model Routing Plugin Integration

**Feature ID**: `F-026`  
**Feature Branch**: `026-openclaw-model-routing-plugin`  
**Created**: 2026-04-15  
**Status**: Completed  
**Input**: 用户已明确切换路线：不再以外挂 proxy 作为主方案，而是把官方 `@blockrun/clawrouter` OpenClaw plugin 真正接进当前副本工作区；若当前 runtime 版本不够，允许升级。

## Context & References

- `AGENTS.md`
- `docs/项目持久化说明.md`
- `docs/governance/README.md`
- `docs/governance/framework-stack.md`
- `.specify/memory/constitution.md`
- `longrun/workspaces/opensparrow-unified/feature_list.json`
- `longrun/workspaces/opensparrow-unified/claude-progress.txt`
- `vendor/mac-openclaw/`
- `scripts/model-routing/`
- `platforms/mac/wrappers/`
- `docs/runbooks/F-025-model-routing-proxy.md`

## 已确认前提

1. 当前仓内 bundled runtime 版本是 `OpenClaw 2026.3.23`。
2. `@blockrun/clawrouter@0.12.149` 要求：
   - `pluginApiRange >= 2026.3.24`
   - `minGatewayVersion = 2026.4.5`
3. 因此当前 bundled runtime 不能直接稳定加载该 plugin。
4. `ClawRouter` plugin 的目标是把 OpenClaw 默认模型切到 `blockrun/auto`，并由 plugin 内部的本地 router 按任务复杂度自动选模型。
5. 当前任务只做**模型智能路由**，不做 Agent 智能路由、不做渠道绑定扩展。

## Goal

为当前副本工作区提供一条可执行的 **OpenClaw 官方 plugin 模型智能路由链路**：

`OpenClaw(compatible runtime) -> @blockrun/clawrouter plugin -> blockrun/auto -> 自动选模型`

并给出最小本地入口：安装 / 开启 / 关闭 / 状态 / CLI 验证。

## In Scope

1. 为 mac 本地 lab 准备一个满足 plugin 版本门槛的 OpenClaw runtime。
2. 安装并启用 `@blockrun/clawrouter` plugin。
3. 提供脚本化入口：
   - 安装 / 升级 runtime
   - 安装 / 启用 plugin
   - 卸载 / 关闭 plugin
   - 查看 plugin/runtime 状态
   - 跑一组 CLI 路由验证
4. 提供 mac `.command` 最小入口。
5. 同步 runbook、spec、longrun。

## Out of Scope

- Agent routing
- Feishu / WeCom / 群聊绑定
- UI Dashboard 改造
- Windows / Linux 同步升级
- 对 `vendor/` 二进制做手工篡改
- 为 ClawRouter 增加新的上游 provider 协议

## Design

### 1. Runtime 策略

- 主目标：提供 **plugin-capable** 的 OpenClaw runtime（版本 `>= 2026.4.5`）。
- 优先策略：通过脚本自动准备 `openclaw@2026.4.14` 的本地 runtime。
- 若当前 bundled runtime 后续被正式升级，可复用它；否则脚本允许维护一个 profile-local / repo-local 的兼容 runtime，而不污染主 profile。

### 2. Plugin 生命周期

**启用时：**
1. 确保兼容 runtime 存在。
2. 使用该 runtime 安装 `@blockrun/clawrouter`。
3. 重启 `openclaw gateway`。
4. 确认 plugin 已加载，且默认模型已切到 `blockrun/auto`。
5. 输出 runtime 版本、plugin 状态、配置路径、wallet 文件位置。

**关闭时：**
1. 卸载 `clawrouter` plugin（优先使用 uninstall，确保 plugin 的 cleanup hook 执行）。
2. 重启 `openclaw gateway`。
3. 确认残留的 `blockrun` provider / `blockrun/*` allowlist / plugin entries 已清理。

### 3. 本地 profile 与隔离

- 默认 profile：`model-routing-lab`
- 默认状态目录：`~/.openclaw-model-routing-lab/`
- Plugin/runtime 管理目录优先放在该 profile 下的 `model-routing/` 子目录，避免污染主配置。

### 4. 验证策略

- 第一层：runtime 版本、plugin list / inspect / doctor。
- 第二层：`openclaw config get agents.defaults.model.primary` 应为 `blockrun/auto` 或带 `blockrun/` 前缀。
- 第三层：CLI 跑简单 / 复杂任务，检查 plugin 日志或响应头中体现的 routing tier/model。
- 若钱包未充值，只验证 plugin 装载与路由链路成立；需要真实付费模型时在 runbook 中明确“需先给 wallet 充值”。

### 5. 回退策略

1. plugin 路线不可用时，保留已实现的 `F-025` proxy/custom-provider 路线作为 fallback。
2. 若用户需要继续使用自带 `URL + API Key` 上游，优先走 `F-025`；官方 plugin 默认走 BlockRun wallet/x402 体系，不直接消费用户给的 OpenAI-compatible key。

## Functional Requirements

- FR-001: 系统 MUST 提供满足 `@blockrun/clawrouter` 最低门槛的 OpenClaw runtime。
- FR-002: 系统 MUST 通过官方 `openclaw plugins install` 流程接入 `@blockrun/clawrouter`。
- FR-003: 系统 MUST 提供 `install/enable/disable/status/test` 脚本，并适配当前 mac 本地 lab。
- FR-004: `disable` MUST 触发 plugin cleanup，而不是只把 gateway 停掉。
- FR-005: 状态脚本 MUST 输出 runtime 版本、plugin 状态、gateway/plugin doctor 结果、默认模型、关键路径。
- FR-006: 文档 MUST 明确区分：官方 plugin 路线走 BlockRun wallet；自定义 `URL + API Key` 路线走 F-025 proxy。

## Success Criteria

1. 在当前副本工作区，可以通过脚本把 `@blockrun/clawrouter` 安装到 OpenClaw 并启用。
2. `openclaw plugins list` / `inspect` / `doctor` 能证明 plugin 已被加载。
3. `openclaw gateway restart` 后，默认模型已切到 `blockrun/auto`。
4. 提供最小 mac 入口用于开启 / 关闭 / 状态检查。
5. runbook、spec、longrun 已同步，且不再把官方 plugin 路线和 F-025 proxy 路线混为一谈。
