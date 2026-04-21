# OpenSparrow Current Status

更新时间：`2026-04-21`

## 总体状态

项目处于：

- **统一真源仓已建立**
- **root repo 可运行**
- **关键 Node / shell 回归链存在**
- **macOS packaged release 已有最新候选**
- **但 packaged WeCom 仍未通过**

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

### 3. macOS packaged release isolation + install hotfix

已确认：

- packaged launch isolation 已修正
- packaged install wizard 卡在“验证连接”的 hotfix 已进入最新 Desktop 候选
- 最新 artifact：
  - `/Users/eduardogan/Desktop/gtclaw-mac-release-arm64-20260420-132429`
  - `/Users/eduardogan/Desktop/gtclaw-mac-release-arm64-20260420-132429.zip`

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
- **Feishu / DingTalk release 面可继续验证**：是
- **WeCom packaged support**：否，当前仍 blocked

## 当前最大的未解决问题

### P0：mac bundled runtime split-brain

已确认事实：

- `vendor/mac-openclaw/bin/node_modules/openclaw` = `2026.3.12`
- `vendor/mac-openclaw/lib/node_modules/openclaw` = `2026.3.23`
- `ui/server.mjs` 当前优先命中 `bin` 那份
- packaged WeCom install 因此会报当前 bundled OpenClaw 版本低于插件要求

进一步已核对：

- npm registry 当前 `openclaw` 最新版是 `2026.4.15`
- `@sunnoy/wecom@3.0.0` peerDependencies 为 `openclaw ^2026.3.23-2`

### 这意味着什么

当前不是“简单改个前端门槛文案”就能解决，而是需要：

1. 修正 mac runtime 单一 truth source
2. 升级到合适的 OpenClaw 版本
3. 让 server / version probe / export / README / release artifact 口径一致
4. 重新打包并做 packaged WeCom fresh verification

### P0：packaged mac diagnosis surface

当前已经开始收口到以下 surface：

- `GET /api/install/status`
- `GET /api/diagnostics`
- `GET /api/diagnostics/export`
- package-local `install-state.json`
- package-local `install.log`
- package-local `diagnostic-bundle.json`

这层的目标是把“安装卡住 / 服务停掉 / 版本不一致 / probe 异常”变成可读证据，而不是只看前端转圈。

## 当前 dirty workspace 摘要

### 已跟踪修改

- `docs/usb-pack/INSTALL.md`
- `docs/usb-pack/SOP.md`
- `longrun/workspaces/openclaw-usb-portable/execution/scripts/create-mac-handoff-copy.sh`
- `longrun/workspaces/opensparrow-unified/claude-progress.txt`
- `longrun/workspaces/opensparrow-unified/feature_list.json`
- `platforms/mac/wrappers/01-开始部署.command`
- `scripts/build-usb-pack.sh`
- `ui/public/dashboard.html`
- `ui/public/index.html`
- `ui/public/replay-surfaces.test.mjs`
- `ui/server.mjs`

### 未跟踪但明显与当前主线有关

- `scripts/model-routing/`
- `scripts/run-root-dashboard.sh`
- `specs/031-dashboard-model-routing-multi-provider/`
- `specs/032-root-dashboard-launcher/`
- `specs/033-model-routing-plugin-allow-guard/`
- `specs/034-model-routing-live-router/`
- `specs/035-macos-release-clean-package/`
- `ui/lib/model-routing-config.mjs`
- `ui/public/dashboard-model-routing-state.mjs`
- `ui/tests/*.mjs`（多个 routing / launcher / shell tests）

### 明显不应混进当前 packet 的杂项

- `My_Skills/`
- `TEMP-openclaw-agent-fallback-guide.md`
- `TEMP-restore-openclaw-context-prompt.md`
- `deep-research-report (4).md`
- `openclaw-routing-brief.html`
- `test-results/`

## 对 ChatGPT Pro 最重要的判断

### 已确认

- 当前 repo 的 authority order 已冻结
- F-031 root repo 最小前后端闭环已存在
- F-035 packaged isolation + install stall hotfix 已有 fresh evidence
- packaged WeCom 当前 blocker 是 **runtime/version truth**，不是单纯 UI 文案
- packaged mac 当前优先级是 **P0 diagnostics surface + runtime truth**，不是直接宣称 channels full closure

### 未确认

- 最新 `openclaw@2026.4.15` 升级后，是否会引入额外 breaking changes
- 当前真实 packaged WeCom 端到端在升级 runtime 后是否能 PASS
- 旧 Notion 中是否还有未转写的决策或 release 口径
