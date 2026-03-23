# Implementation Plan: DingTalk Stream Win/Mac Parity

**Branch**: `004-dingtalk-stream-win-parity` | **Date**: 2026-03-14 | **Spec**: `specs/004-dingtalk-stream-win-parity/spec.md`  
**Input**: Feature specification from `specs/004-dingtalk-stream-win-parity/spec.md`

## Summary

本 feature 聚焦两条主线：

1. 修复 Windows 一键部署链路中 DingTalk 参数契约不一致（`corpId` 误设为硬性必填）导致的安装失败。
2. 建立 Win/Mac 对照验证基线，确保 DingTalk Stream 长连接行为可比且可追溯。

同时补齐错误可观测性，避免再次出现“只有 HTTP 400，没有根因”的排障盲区。

## Technical Context

**Language/Version**: Node.js ESM, PowerShell  
**Primary Dependencies**: bundled OpenClaw runtime, `@openclaw-china/channels`, `@openclaw-china/dingtalk`  
**Storage**: `~/.openclaw-<profile>/openclaw.json`, `ui-meta.json`, sessions/logs  
**Testing**: local API contract checks + one-click script replay + channel status/probe + manual message loop  
**Target Platform**: Windows (primary), Mac (baseline compare)  
**Project Type**: local deploy orchestrator + UI backend contract  
**Constraints**:
- Must not break Feishu/WeCom already-working paths.
- Must keep backward compatibility for existing profile files.
- Must preserve Spec-Kit document-first workflow.

## Constitution Check

- 文档先行：先提交 `spec.md` / `plan.md` / `tasks.md`，再进入实现。✅
- 可复现验证：所有回归步骤需可命令化并写入 longrun runbook。✅
- 安全约束：不写入任何明文密钥到仓库文档。✅
- 变更最小化：优先修正契约与错误暴露，不做无关重构。✅

## Investigation Conclusions (Validated)

1. **契约不一致（核心根因）**  
   - UI backend 目前把 DingTalk `corpId` 作为必填校验。  
   - 本地已安装的 `@openclaw-china/dingtalk` schema 实际只强依赖 `clientId/clientSecret`。

2. **Windows 一键部署 payload 信息丢失**  
   - `usb-pack/one-click-deploy.ps1` 的 `Build-InstallPayload` 仅从 `openclaw.json` 读取 DingTalk。  
   - `corpId` 实际保存在 `ui-meta.json`，未进 payload。  
   - 在当前后端必填校验下，重跑部署会触发 400。

3. **错误可观测性不足**  
   - 一键脚本在 4xx 场景经常仅显示 `HTTP 400`，未可靠展示后端 `errors[]`。

4. **运行态证据**  
   - 本机可复现实测：执行 `usb-pack/one-click-deploy.ps1` 返回 `Install failed: HTTP 400`。  
   - 直接调用 `/api/install`（DingTalk 缺 `corpId`）返回 `{"ok":false,"errors":["钉钉 CorpId 不能为空"]}`。

## Proposed Design

### A. Align DingTalk Contract with Runtime Schema

- 调整后端输入校验：
  - DingTalk 必填仅保留 `clientId/clientSecret`。
  - `corpId` 改为可选 metadata（提示和展示用途）。
- `configureChannel` 继续写入运行必需字段，`corpId/robotCode` 仍写入 `ui-meta.json`（可选）。

### B. Harden Windows One-Click Payload Builder

- `Build-InstallPayload` 增加读取 `ui-meta.json` 的能力（若存在则补充 `corpId/robotCode`）。
- 兼容缺失场景：无 `ui-meta.json` 时不失败，使用最小可运行字段提交。

### C. Improve Deployment Error Diagnostics

- 强化 `Read-WebExceptionBody` 与响应解析兼容性（PS5/PS7）。
- 将后端 `errors[]/message` 透传到终端，保留 raw fallback。

### D. Regression Guardrails

- 钉钉修复后必须执行 Feishu/WeCom 对照回归（安装、status/probe、消息 smoke）。
- 补 longrun F-006 runbook + evidence checklist，形成可交付复验闭环。

## Validation Strategy

1. **Contract Tests**
- `/api/install` with DingTalk `{clientId, clientSecret}` and no `corpId` should pass validation.
- `/api/config/channels` update DingTalk without `corpId` should not return 400.

2. **Windows One-Click Replay**
- Replay existing profile with DingTalk enabled; expect success.
- Intentionally trigger validation errors; confirm detailed error output appears in script.

3. **Channel Regression**
- `channels status --probe` for Feishu/WeCom unchanged from baseline.
- DingTalk manual message loop evidence captured (session update + timestamp).

4. **Cross-Platform Compare**
- Use same app credentials and same checklist on Mac and Windows.
- Record deltas in longrun investigation doc, classify as script-layer vs runtime-layer.

## Complexity Tracking

| Decision | Why Needed | Simpler Alternative Rejected Because |
|----------|------------|--------------------------------------|
| Make `corpId` optional in backend contract | Match real plugin schema and historical config | Keeping mandatory `corpId` continues Windows replay failure |
| Read optional DingTalk meta from `ui-meta.json` in one-click script | Preserve UI-collected metadata when available | Ignoring meta entirely loses useful diagnostics context |
| Improve PS error-body extraction | Remove blind `HTTP 400` failures | Retaining current behavior blocks root-cause diagnosis |
