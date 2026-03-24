# Feature Specification: OpenClaw Runtime Upgrade to 2026.3.23

**Feature Branch**: `010-openclaw-runtime-upgrade`
**Created**: 2026-03-24
**Status**: Planning
**Input**: `research/openclaw-version-upgrade-report-20260324.md` 调研报告确认当前 vendor 版本严重滞后（Mac 3.7 / Win 3.12），最新稳定版 2026.3.23 包含 20+ 安全修复和 2 个破坏性变更。

## Context & References

- `research/openclaw-version-upgrade-report-20260324.md` — 完整调研报告
- `vendor/mac-openclaw/` — macOS 运行时（当前 openclaw@2026.3.7）
- `vendor/windows-openclaw/` — Windows 运行时（当前 openclaw@2026.3.12）
- `vendor/linux-openclaw/` — Linux 运行时（Node v24.14.0，无独立 openclaw 包）
- `ui/server.mjs` — UI 控制面，调用 openclaw CLI 和读写 openclaw.json
- `scripts/openclaw-usb/install-local-feishu.sh` — 共享安装脚本
- `scripts/openclaw-usb/install-local-feishu.ps1` — Windows 安装脚本
- `platforms/windows/wrappers/one-click-deploy.ps1` — Windows 一键部署
- `deploy/docker/` — Docker baseline

## User Stories

### User Story 1 — 安全维护者需要消除已知 CVE（P0）

作为安全维护者，我需要把 vendor 内的 openclaw 运行时升级到修复了 20+ CVE 的 2026.3.23 版本，尤其是飞书 webhook 签名验证绕过（GHSA-g353-mgv3-8pcj）和 WebSocket 跨站劫持（GHSA-5wcw-8jjv-m286）。

**Acceptance**:

1. 三个平台的 vendor 目录内 openclaw 版本统一为 2026.3.23。
2. `scripts/verify-vendor.sh`（如已有）或手动校验输出版本一致。
3. 安全修复覆盖面记录在升级 runbook 中。

### User Story 2 — 开发者需要适配破坏性变更（P0）

作为开发者，我需要确保 `gateway.auth.mode` 显式配置和 ClawHub-first 插件安装不会导致现有安装流程失败。

**Acceptance**:

1. `ui/server.mjs` 生成的 openclaw.json 在同时配置 token 和 password 时写入 `gateway.auth.mode`。
2. 安装脚本中的 `npm install -g openclaw` 回退逻辑适配 ClawHub-first 变更（如需要）。
3. DingTalk 社区插件安装路径在 ClawHub-first 模式下可用。

### User Story 3 — 用户需要默认模型更新（P1）

作为用户，我需要安装后的默认模型从过时的 `gpt-4o-mini` 更新到当前推荐模型。

**Acceptance**:

1. 所有硬编码 `gpt-4o-mini` 的位置改为可配置，默认值更新。
2. 已有安装不受影响（配置文件中已写入的模型不变）。

### User Story 4 — 维护者需要平台版本一致性（P1）

作为维护者，我需要 Mac / Windows / Linux 三个 vendor 平台包含一致版本的 openclaw 运行时。

**Acceptance**:

1. 三个 vendor 目录的 openclaw 版本号相同（2026.3.23）。
2. Node.js 版本保持 v24.14.0 或更新的 LTS。
3. 版本信息记录在 `docs/vendor-source-inventory.md` 中。

## Functional Requirements

- FR-001: 更新 `vendor/mac-openclaw/` 的全局 openclaw 至 2026.3.23。
- FR-002: 更新 `vendor/windows-openclaw/node_modules/openclaw/` 至 2026.3.23。
- FR-003: 为 `vendor/linux-openclaw/` 补充 openclaw 2026.3.23 包（如当前缺失）。
- FR-004: `ui/server.mjs` 在写入 openclaw.json 时，当 gateway.auth 同时存在 token 和 password 时显式写入 `gateway.auth.mode`。
- FR-005: 更新所有硬编码 `gpt-4o-mini` 为可配置默认值（建议 `openai/gpt-4o-mini` → 保持不变或改为用户可选，但不要硬绑 gpt-5.4 以免对无权限用户造成问题）。
- FR-006: 验证 DingTalk 社区插件（openclaw-plugin-dingtalk）在 ClawHub-first 模式下的安装行为。
- FR-007: 更新 `deploy/docker/` baseline 中的模型默认值与配置逻辑。
- FR-008: 更新 `docs/vendor-source-inventory.md` 记录新版本信息。

## Non-Goals

- 不在本阶段升级 Node.js runtime 版本（保持 v24.14.0）。
- 不在本阶段实现 Docker 多阶段构建优化（新版提供的 slim 变体）。
- 不在本阶段迁移到 Kubernetes 部署路径。
- 不在本阶段启用 ClawHub 作为主要插件来源（保守策略：确保 npm 回退可用即可）。

## Risk Assessment

| 风险 | 等级 | 缓解措施 |
|------|------|---------|
| vendor 更新后本地安装流程变化 | 高 | 升级后立即做 Mac 飞书 E2E 回归 |
| gateway.auth.mode 变更导致现有配置失效 | 高 | 审查所有 openclaw.json 写入路径，确保兼容 |
| ClawHub-first 导致 DingTalk 插件安装异常 | 中 | 验证 npm 回退路径可用 |
| v2026.3.22 打包 bug 残留 | 低 | 直接升级到 2026.3.23，跳过 3.22 |
| 默认模型更新影响无 GPT-5 权限的用户 | 中 | 保持 gpt-4o-mini 或改为用户可选 |

## Success Criteria

1. 三个平台 vendor 内 openclaw 版本均为 2026.3.23。
2. `node --check ui/server.mjs` 通过。
3. `bash -n scripts/openclaw-usb/*.sh` 通过。
4. `./longrun/workspaces/opensparrow-unified/init.sh` 通过。
5. Mac 飞书安装 E2E 回归通过（新 profile 从零安装 + /api/status 断言）。
6. Docker baseline 回归通过（docker compose config + bootstrap + /api/status）。
7. feature_list.json、progress log、runbook 已同步。
