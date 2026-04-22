# OpenSparrow Current Status

更新时间：`2026-04-22`

## 总体状态

项目当前处于：

- **统一真源仓已建立**
- **root repo 可运行**
- **关键 Node / shell 回归链存在**
- **macOS packaged diagnostics / runtime truth / first-click 已有 fresh evidence**
- **latest packaged mac artifact 已完成 DingTalk / WeCom channel-specific fresh evidence**
- **Windows-specific evidence 仍是独立后续线，不被当前 mac packaged PASS 自动覆盖**

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

- 这不等于 Windows 线已完成
- 也不等于 officialization 全部完成

### 3. macOS packaged diagnostics / runtime truth / first-click

已确认：

- packaged launch isolation 已修正
- packaged install wizard 不再依赖前端假进度，改为轮询真实 `/api/install/status`
- packaged runtime dependency closure 已补齐：`ui/lib/model-routing-config.mjs`、`ui/lib/openai-provider.mjs`、`scripts/model-routing/lib/custom-plugin-routing.mjs`
- packaged first-click 已能启动 server
- `/api/status`、`/api/install/status`、`/api/diagnostics`、`/api/diagnostics/export` 都已在 fresh artifact 中可达
- package-local `install-state.json`、`install.log`、`diagnostic-bundle.json` 已能真实生成
- artifact 内已固定 `vendor/mac-openclaw/RUNTIME_TRUTH.json`

### 4. packaged DingTalk / WeCom support closure

当前最新 fresh packaged lineage：

- artifact lineage：`gtclaw-mac-release-arm64-20260422-150245`
- preserved handoff bundle：`/Users/eduardogan/Desktop/GHJProject/opensparrow-gptpro-handoff-20260422-1518-dingtalk-wecom-pass.zip`

已确认：

- DingTalk real `/api/install` → `completed`
- WeCom real `/api/install` → `completed`
- 两条 channel 的 `runtimeMode` 都是 `daemon`
- `channelProbes.dingtalk.status = ok` 且 `ready = true`
- `channelProbes.wecom.status = ok` 且 `ready = true`
- `/api/install`、`/api/install/status`、`install-state.json`、`diagnostic-bundle.json`、`/api/diagnostics`、`/api/diagnostics/export` 已对同一条 packaged session 给出一致结论
- packaged WeCom 当前已切到官方插件路线：`@wecom/wecom-openclaw-plugin`
- bundled archive 已切到 `plugins/wecom-wecom-openclaw-plugin-2026.4.22.tgz`
- 旧 `@sunnoy/wecom` packaged blocker 与 `unknown channel id: wecom` follow-on error 未在最新 fresh evidence 中复现
- DingTalk 旧 `daemon unknown / gateway fallback` 假阳性 probe warning 未在最新 fresh evidence 中复现

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
- **WeCom packaged support**：是（latest fresh artifact）
- **DingTalk packaged support**：是（latest fresh artifact）
- **feature-level packaged channel closure**：是（基于同一轮 fresh evidence）

## 当前主要剩余事项

### 1. Windows-specific evidence 仍需独立推进

当前已确认：

- mac packaged channel closure 已完成
- 这不能反向证明 Windows 已完成
- `F-025-B` 仍应按 `blocked on Windows-specific evidence` 处理，直到 Windows 线拿到自己的 fresh proof

### 2. GitHub tree 仍不是完整 runtime 复现面

当前已确认：

- GitHub 上可审代码、文档、spec、longrun
- 但 bundled runtime 不在 GitHub tree 中
- 因此真实 packaged rerun 仍需要本地 artifact / evidence bundle，而不是只靠 GitHub 浏览

### 3. 当前收尾重点已从“证明 channels”转向“同步 truth / handoff / writeback”

当前不是继续猜 channel blocker，而是：

1. 把 fresh packaged DingTalk / WeCom truth 同步到 active docs / spec / longrun
2. 保留 handoff bundle 供后续 Windows / GPT Pro 只读参考
3. 继续把 Windows 线与当前 mac packaged/channel 线拆开处理

## 对 ChatGPT Pro 最重要的判断

### 已确认

- 当前 repo 的 authority order 已冻结
- F-031 root repo 最小前后端闭环已存在
- F-035 packaged isolation + install stall hotfix 已有 fresh evidence
- packaged runtime truth / first-click / diagnostics export 已有 fresh evidence
- latest packaged mac artifact 已完成 DingTalk / WeCom channel-specific closure
- packaged WeCom 当前 authoritative route 是官方插件，不再是旧 `sunnoy-wecom` packaged blocker 口径
- Windows 线必须单独拿自己的 truth inventory、test matrix、implementation 与 fresh evidence

### 未确认

- GitHub tree 之外是否还有未整理的旧 release / Notion 口径
- Windows-specific surfaces 的真实验证闭环何时完成
