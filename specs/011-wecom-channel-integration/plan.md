# Implementation Plan: WeCom Channel Integration Hardening

**Branch**: `011-wecom-channel-integration` | **Date**: 2026-04-14 | **Spec**: `specs/011-wecom-channel-integration/spec.md`

## Summary

`F-014` 是当前 unified repo 唯一未通过项，但企微主链路其实已经部分存在：当前业务主链是企业微信智能机器人 API / 长连接，安装 UI、服务端 `handleInstall()` 分支、插件安装与频道配置写入逻辑都已落地。当前最大的短板不是“从零做功能”，而是：

1. feature 没有正式 spec / plan / tasks；
2. 企微纯逻辑堆在 `ui/server.mjs` 中，不够优雅且不可单测；
3. 缺少专属 runbook 去区分自动验证链路、`Bot ID + Secret` 长连接主链补证、以及仅在特定业务场景下才需要的 callback / 自建应用增强补证。

本轮目标是先把这块收口成“可维护、可验证、可继续推进”的状态：抽 helper、补测试、补文档、同步长期记录。真实企业微信凭据补证的主目标应锚定为：带真实企微 `Bot ID + Secret` 的一次真实 UI 安装，以及至少一次真实消息收发 / 对话成功；callback 若当前业务实际依赖，再另列为扩展验证项，不伪造通过。

## Technical Context

- **Repository root**: `/Users/eduardogan/Desktop/GHJProject/opensparrow`
- **Primary write targets**:
  - `specs/011-wecom-channel-integration/spec.md`
  - `specs/011-wecom-channel-integration/plan.md`
  - `specs/011-wecom-channel-integration/tasks.md`
  - `ui/lib/wecom.mjs`
  - `ui/lib/wecom.test.mjs`
  - `ui/public/wecom-helpers.js`
  - `ui/public/wecom-helpers.test.mjs`
  - `ui/public/index.html`
  - `ui/public/dashboard.html`
  - `ui/server.mjs`
  - `docs/runbooks/F-014-wecom-channel-integration.md`
  - `longrun/workspaces/opensparrow-unified/claude-progress.txt`
- **Validation anchors**:
  - `node --test ui/lib/wecom.test.mjs`
  - `node --check ui/server.mjs`
  - 如需要：`node --test ui/tests/install-helpers.test.mjs`

## Design

### A. Extract Pure WeCom Helpers

把以下纯逻辑从 `ui/server.mjs` 提取到 `ui/lib/wecom.mjs`：

- `isLikelyWecomBotId`
- `normalizeWecomCredentials`
- `collectWecomInputErrors`
- `enrichWecomChannelForUi`

这样 `server.mjs` 只保留 orchestration / IO / OpenClaw 调用，企微字段规则集中在一个可测试模块中。

### B. TDD Regression Net

新增 `ui/lib/wecom.test.mjs`，至少覆盖：

- Bot ID 正则判断
- UI 扁平字段与持久化嵌套字段都能被归一化
- 必填字段与成组字段错误能正确提示
- `enrichWecomChannelForUi` 会把嵌套结构还原为 UI 需要的扁平字段

### C. Front-end Rule Deduplication

- 新增 `ui/public/wecom-helpers.js`，把浏览器端共用的 Bot ID 判断与字段校验收敛到一个全局 helper。
- `ui/public/index.html` 与 `ui/public/dashboard.html` 只保留轻量 wrapper 或直接调用共享 helper，避免两处内联逻辑漂移。
- 新增 `ui/public/wecom-helpers.test.mjs`，用 Node `vm` 验证浏览器 helper 导出的全局 API。

### D. Documentation & Evidence Boundary

新增 `docs/runbooks/F-014-wecom-channel-integration.md`，记录：

- 当前仓企微长连接主链现状
- `Bot ID + Secret` 是最小真实入口
- 已自动验证项
- 仍需真实凭据验证项（主链 / 扩展链路拆分）
- 推荐手工补证方式

### E. Longrun Write-back

本轮可以同步“代码结构与自动验证已收口”，但若没有真实企微 `Bot ID + Secret` 主链补证，则不把 `F-014` 直接写成通过，而是在 progress 中明确剩余手工 E2E gap；callback 仅在业务确实依赖时追加为扩展 gap。

## Validation Plan

1. 先新增 `ui/lib/wecom.test.mjs`，引用尚不存在的 helper 模块，确认红灯。
2. 新增 `ui/lib/wecom.mjs` 并把 `ui/server.mjs` 接上，确认绿灯。
3. 新增 `ui/public/wecom-helpers.js` 与 `ui/public/wecom-helpers.test.mjs`，把两页前端企微校验逻辑收敛到共享 helper。
4. 运行 `node --check ui/server.mjs`，确认抽取后服务端语法无误。
5. 补 runbook，并在 `claude-progress.txt` 记录当前自动验证证据与真实凭据 E2E 缺口。
