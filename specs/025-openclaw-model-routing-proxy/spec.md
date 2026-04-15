# Feature Specification: OpenClaw Model Routing Proxy Integration

**Feature ID**: `F-025`  
**Feature Branch**: `025-openclaw-model-routing-proxy`  
**Created**: 2026-04-14  
**Status**: Implemented  
**Input**: 用户已明确要求：仅做“模型智能路由”工程落地，不做 Agent 智能路由、不升级 OpenClaw core、不改 `vendor/`，默认路线为 `ClawRouter standalone/proxy + OpenClaw custom provider`。

## Context & References

- `AGENTS.md`
- `docs/项目持久化说明.md`
- `docs/governance/README.md`
- `docs/governance/framework-stack.md`
- `.specify/memory/constitution.md`
- `longrun/workspaces/opensparrow-unified/feature_list.json`
- `longrun/workspaces/opensparrow-unified/claude-progress.txt`
- `ui/server.mjs`
- `ui/lib/openai-provider.mjs`
- `platforms/mac/wrappers/01-开始部署.command`
- `scripts/openclaw-usb/install-local-feishu.sh`

## 已确认前提

1. 当前 OpenClaw `2026.3.23` 不原生支持 `models.routing` / `classifier_model` / `strategy: "llm"` 等模型语义自动路由配置。
2. 当前版本已确认支持多 provider、primary model、fallbacks。
3. `ClawRouter` 的 OpenClaw plugin 兼容门槛高于当前本地 gateway；因此本轮默认不走 plugin 模式，也不默认升级 OpenClaw。
4. `ClawRouter` standalone/proxy 模式提供本地 OpenAI-compatible 入口，默认端口 `8402`。

## Goal

在不改 `vendor/`、不升级 OpenClaw core 的前提下，为当前副本工作区加入一条可运行的“模型智能路由”链路：

`OpenClaw -> custom provider(clawrouter) -> ClawRouter standalone proxy -> 智能选模型`

## In Scope

1. 新增 profile-local 的 ClawRouter 安装 / 启停 / 状态脚本。
2. 新增独立 `clawrouter` provider 配置，不覆盖现有 `openai` provider。
3. 把默认模型切到 `clawrouter/blockrun/auto`。
4. 启用时保留当前 fallback 机制，并把“启用前 primary model”临时追加为 fallback，作为路由代理失效时的回退。
5. 新增 macOS 最小入口：开启 / 关闭 / 状态检查 `.command`。
6. 新增 runbook 与 longrun 记录。

## Out of Scope

- OpenClaw core 升级。
- `vendor/` 二进制改写。
- ClawRouter plugin 模式适配。
- Dashboard UI 开关重做。
- Agent 智能路由。
- 飞书 / 群聊 / 多 Agent 绑定方案。

## Design

### 1. Provider 命名与模型别名

- provider id：`clawrouter`
- provider model id：`blockrun/auto`
- OpenClaw primary target：`clawrouter/blockrun/auto`
- provider base URL：`http://127.0.0.1:<port>/v1`
- auth profile：`clawrouter:default`，key 固定写入 `x402`

这样做的原因：
- 不覆盖现有 `openai` provider；
- OpenClaw 内部仍能把上游请求模型识别为 `blockrun/auto`；
- 当前 profile 中原有 provider / fallback 可保留。

### 2. 安装与运行时隔离

- ClawRouter 包安装到 `~/.openclaw-<profile>/model-routing/clawrouter-runtime/`
- 状态文件：`~/.openclaw-<profile>/model-routing/clawrouter-state.json`
- PID / log：同目录下 `clawrouter.pid`、`clawrouter.log`

### 3. 启用 / 关闭契约

**启用时：**
1. 记录当前 `primary`、`fallbacks`、现有 `clawrouter` provider 配置、auth profiles。
2. 启动或复用本地 `ClawRouter` 代理。
3. 写入 `models.providers.clawrouter`。
4. 写入 `clawrouter:default` auth profile（`x402`）。
5. `models set clawrouter/blockrun/auto`。
6. fallback 列表保留原有内容，并在缺失时追加“启用前 primary”。

**关闭时：**
1. 恢复启用前 primary / fallbacks。
2. 恢复启用前 auth profiles 与 `clawrouter` provider 配置。
3. 若代理由本脚本启动，则关闭代理。

### 4. 失败回退

1. 若 ClawRouter 安装或启动失败，脚本必须 best-effort 回滚到启用前配置。
2. 若运行中代理失效，OpenClaw 仍可按现有 fallback 机制继续回退到启用前 primary model。
3. 若用户明确不想继续使用智能路由，执行 disable 脚本即可回到启用前状态。

## Functional Requirements

- FR-001: 系统 MUST 通过独立 `clawrouter` provider 接入模型智能路由，而不是覆盖 `vendor/` 或要求 OpenClaw core 升级。
- FR-002: 系统 MUST 提供可执行的启用 / 关闭 / 状态脚本，默认适配 macOS 本地副本工作区。
- FR-003: 启用脚本 MUST 把 ClawRouter 安装到 profile-local 目录，而不是写入 `vendor/`。
- FR-004: 启用脚本 MUST 在切换 primary model 前备份当前 primary / fallbacks / auth / provider state。
- FR-005: 启用脚本 MUST 保留当前 fallback 列表，并在缺失时追加启用前 primary model。
- FR-006: 关闭脚本 MUST 恢复启用前 primary / fallbacks / auth / provider state。
- FR-007: 状态脚本 MUST 报告当前 primary model、provider 是否已写入、proxy 健康状态、state file 与 log file 位置。

## Success Criteria

1. `scripts/model-routing/enable-clawrouter.sh` 能安装并启动 standalone ClawRouter，并把 OpenClaw primary model 切到 `clawrouter/blockrun/auto`。
2. `scripts/model-routing/disable-clawrouter.sh` 能恢复启用前 primary / fallback / auth / provider 状态。
3. `platforms/mac/wrappers/02-开启模型智能路由.command`、`03-关闭模型智能路由.command`、`04-检查模型智能路由.command` 可作为最简入口。
4. 单元测试覆盖 provider config、fallback merge、auth merge/remove 纯逻辑。
5. 文档与 longrun 已同步，不再把本轮误写成 Agent routing 或 OpenClaw core routing。
