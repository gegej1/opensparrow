# OpenSparrow Current Status

更新时间：`2026-04-22`

## 总体状态

项目处于：

- **统一真源仓已建立**
- **root repo 可运行**
- **关键 Node / shell 回归链存在**
- **macOS packaged diagnostics / runtime truth / first-click 已有 fresh evidence**
- **但 packaged WeCom / DingTalk 仍未通过**

## 已确认完成的面

### 1. Unified repo / governance / longrun

以下层级已经存在并可读：

- `AGENTS.md`
- `.specify/memory/constitution.md`
- `docs/governance/`
- `specs/`
- `longrun/workspaces/opensparrow-unified/`

### 2. GTClaw branding + dashboard model routing

已完成并有 fresh evidence 的范围：

- Dashboard / install shell 已切换 GTClaw branding
- `ui/server.mjs` / `ui/lib/model-routing-config.mjs` / `ui/public/dashboard-model-routing-state.mjs` 已接入 model routing
- root repo live router 已打通

注意：

- 这不等于 F-027 全部完成
- 也不等于 packaged WeCom / officialization / Windows 全部完成

### 3. macOS packaged diagnostics / runtime truth / first-click

已确认：

- packaged launch isolation 已修正
- packaged install wizard 不再依赖前端假进度，改为轮询真实 `/api/install/status`
- packaged runtime dependency closure 已补齐：`ui/lib/model-routing-config.mjs`、`ui/lib/openai-provider.mjs`、`scripts/model-routing/lib/custom-plugin-routing.mjs`
- packaged first-click 已能启动 server
- `/api/status`、`/api/install/status`、`/api/diagnostics`、`/api/diagnostics/export` 都已在 fresh artifact 中可达
- package-local `install-state.json`、`install.log`、`diagnostic-bundle.json` 已能真实生成

## 当前实际可运行性

### Root repo

- **可运行**：是
- **可测试**：是（Node tests + shell syntax + init 合同）
- **可继续开发**：是

### GitHub 仓库

- **代码与 docs 可审阅**：是
- **完整 runtime 可复现**：否

原因：

- `vendor/` 被 `.gitignore` 排除，不在 GitHub tree 中

### Latest mac release candidate

- **可启动**：是
- **P0 diagnostics / export / evidence**：是
- **WeCom packaged support**：否，当前仍 blocked
- **DingTalk packaged support**：否，当前未宣称 PASS

## 当前最大的未解决问题

### P0：channel-specific evidence 仍待完成

已确认事实：

- fresh artifact 已补齐 runtime truth manifest：`vendor/mac-openclaw/RUNTIME_TRUTH.json`
- canonical runtime source 已固定为 `lib`
- `lib/bin` 当前版本已对齐，不再允许 version drift 后继续出包
- packaged diagnostics endpoints 已能导出证据
- channel probe persistence 已进入 `/api/install`、`/api/install/status`、`install-state.json`、`diagnostic-bundle.json`、`/api/diagnostics`、`/api/diagnostics/export`

当前尚未完成的是：

- fresh packaged WeCom channel-specific evidence
- fresh packaged DingTalk channel-specific evidence
- channels full closure / PASS 证明

### 这意味着什么

当前不是“再补一个 UI 文案”就能结束，而是需要：

1. 用 fresh packaged artifact 跑 WeCom evidence
2. 验证 `channelProbes.wecom` 是否进入 install-state / diagnostics export
3. 在不暴露 secret 的前提下收集 package-local 证据
4. 再决定是否进入 DingTalk evidence 阶段

### P0：packaged mac diagnosis surface

当前已经开始收口到以下 surface：

- `GET /api/install/status`
- `GET /api/diagnostics`
- `GET /api/diagnostics/export`
- package-local `install-state.json`
- package-local `install.log`
- package-local `diagnostic-bundle.json`

这层的目标是把“安装卡住 / 服务停掉 / 版本不一致 / probe 异常”变成可读证据，而不是只看前端转圈。

## 对 ChatGPT Pro 最重要的判断

### 已确认

- 当前 repo 的 authority order 已冻结
- F-031 root repo 最小前后端闭环已存在
- F-035 packaged isolation + install stall hotfix 已有 fresh evidence
- packaged runtime truth / first-click / diagnostics export 已有 fresh evidence
- packaged mac 当前优先级仍是 **P0 diagnostics surface + channel-specific evidence**，不是直接宣称 channels full closure

### 未确认

- 当前真实 packaged WeCom 端到端是否能 PASS
- 当前真实 packaged DingTalk 端到端是否能 PASS
- 旧 Notion 中是否还有未转写的决策或 release 口径
