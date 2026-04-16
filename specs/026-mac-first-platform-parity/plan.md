# Commander Plan: Mac-first Platform Parity

**Feature ID**: `F-026`  
**Feature Branch**: `026-mac-first-platform-parity`  
**Date**: 2026-04-15  
**Spec**: `specs/026-mac-first-platform-parity/spec.md`

## 战役摘要

`F-026` 是一个独立的 mac-first scope freeze feature，不是 `F-025-B` 的 Mac 子包，也不是“把 Mac 的所有东西一次做完”。  
当前目标只是在不重开 `F-003`、`F-014 = wecom-channel-integration`、`F-025`，也不把 `specs/014-mac-arm64-installer-hardening/` 误写成当前 authority feature id 的前提下，把 macOS 当前用户直接路径上的 wrapper / companion / UI service binding parity surface 收敛成可派工的最小 packets。

本轮 `spec / plan / tasks` 只冻结后续 `A1 / A2 / A3` 的边界，不执行它们，不 close `F-026`。

## Packet 顺序与依赖

- `PKT-026-A1` 是首个 live packet，必须先完成 mac truth / divergence inventory；
- `PKT-026-A2` 只能在 `PKT-026-A1` 完成并冻结 divergence attribution 后启动；
- `PKT-026-A3` 只能在 `PKT-026-A2` 完成后启动，并且只能作为 mac verification-only closure packet；
- 若任一 packet 发现问题需要重开 `F-003`、`F-014 = wecom-channel-integration`、`F-025`，或把 `specs/014-mac-arm64-installer-hardening/` 升格成当前 feature id，必须停止并回到 Commander gate；
- `F-025-B` 保持 `blocked on Windows-specific evidence`，与 `F-026` 并行但不合并。

---

## PKT-026-A1：mac truth inventory / divergence inventory

- **Goal**: 盘清 mac current user-path 上的 wrapper / companion / UI binding truth surface，并把 divergence attribution 冻结成 Commander 可派工 inventory。
- **Scope**:
  - 只盘点 `platforms/mac/wrappers/*`、`platforms/mac/companion/*`、`ui/server.mjs`、`ui/public/index.html`、`ui/public/dashboard.html` 的 mac direct user-path surface；
  - 区分 primary launcher、secondary wrapper、companion control、UI service binding 四类 surface；
  - 只做 packet attribution，不把 noisy workspace 自动当作 scope 扩张理由。
- **Non-goals**:
  - 不修实现；
  - 不重开 `F-003` 的 status/reset/force-setup 契约；
  - 不重开真正的 `F-014 = wecom-channel-integration`，也不把 `specs/014-mac-arm64-installer-hardening/` 的 package / archive / bundled plugin hardening 上游结论写成 `F-014`；
  - 不把 Mac 并入 `F-025-B`；
  - 不做 broader docs parity、callback、schema migration、cleanup 或容器化扩战。
- **Owner**: `Worker-A`
- **Reviewer**: `SpecReviewer`
- **Verifier**: `Batch Verifier`
- **Closer**: `Commander`
- **Write-set**:
  - `specs/026-mac-first-platform-parity/mac-truth-inventory.md`
- **Read-set**:
  - `specs/026-mac-first-platform-parity/spec.md`
  - `specs/026-mac-first-platform-parity/plan.md`
  - `specs/026-mac-first-platform-parity/tasks.md`
  - `platforms/mac/wrappers/01-开始部署.command`
  - `platforms/mac/wrappers/run-openclaw-usb.command`
  - `platforms/mac/wrappers/harden-openclaw-usb.command`
  - `platforms/mac/companion/start`
  - `platforms/mac/companion/stop`
  - `platforms/mac/companion/gateway`
  - `platforms/mac/companion/onboard`
  - `ui/server.mjs`
  - `ui/public/index.html`
  - `ui/public/dashboard.html`
  - `specs/003-opensparrow-ui-reset-hardening/spec.md`
  - `specs/014-mac-arm64-installer-hardening/spec.md`（历史 spec 目录；不是当前 authority 中的 `F-014`）
  - `specs/025-channel-replay-doc-parity/spec.md`
- **Required checks**:
  - 必须明确 primary launcher 与 secondary wrapper 的角色边界；
  - 必须明确 mac companion control chain 与 UI service binding 的衔接点；
  - 必须明确哪些 divergence 属于 launcher / shell / env / cwd / runtime path，哪些属于 install / dashboard / read-back / daemon binding；
  - 不得把 `F-003`、`F-014 = wecom-channel-integration`、`F-025` 的冻结结论写回未定事项，也不得把 `specs/014-mac-arm64-installer-hardening/` 写成真正的 `F-014`。
- **Fresh verification evidence**:
  - 对上述 mac truth surface 的 fresh reread；
  - 来自 macOS 主机的 launcher / shell / UI binding 归因笔记、命令输出或 operator evidence；
  - 历史 longrun / handoff 只能做背景，不构成 DONE 证据。
- **Done standard**:
  - Commander 获得 packet-local mac truth inventory；
  - 每个 divergence 都已归因到明确 surface，或被明确标记为超出 `F-026` 边界；
  - `PKT-026-A2` 的实现边界被冻结。
- **Blocked standard**:
  - 若没有 macOS-specific fresh evidence 就无法归因当前差异；
  - 若问题本质落在 `F-003`、`F-014 = wecom-channel-integration`、`F-025-B`、`specs/014-mac-arm64-installer-hardening/` 的 package hardening 上游结论、broader docs parity、cleanup 或 packaging 重整。
- **Stop rule**:
  - `A1` 不得修改 `spec.md / plan.md / tasks.md`；
  - 若发现 design gap / authority gap，必须停在 `A1` 并回到单独的 spec review / Commander gate；
  - 一旦 inventory 开始演变成实现修复、全仓 cleanup、旧 feature 重开或 broader docs 扫描，立即停包。

## PKT-026-A2：mac wrapper / launcher / replay fidelity closure

- **Goal**: 只收口 `A1` 已归因的 mac direct user-path fidelity 差异，覆盖 launcher / companion / install / dashboard / read-back / daemon binding 的必要闭环。
- **Scope**:
  - 只处理 `A1` 已明确归因到 mac wrapper / companion / UI binding surface 的 divergence；
  - 允许收口 `.command` / shell / env / cwd / runtime path 差异；
  - 允许收口 `ui/server.mjs`、`ui/public/index.html`、`ui/public/dashboard.html` 中直接影响 mac launcher / install / dashboard / read-back / daemon binding 的 surface；
  - 不扩大到 package archive、bundled plugin、schema 或更广的 UI cleanup。
- **Non-goals**:
  - 不重开 `F-003` 的 reset/status contract；
  - 不重开真正的 `F-014 = wecom-channel-integration`，也不把 `specs/014-mac-arm64-installer-hardening/` 的 arm64 package hardening 上游结论写成 `F-014`；
  - 不重开 `F-025-B` 或吸收 Windows evidence；
  - 不做 broader docs parity、callback、自建应用增强、schema migration、cleanup / refactor、containerization。
- **Owner**: `Worker-A`
- **Reviewer**: `SpecReviewer`
- **Verifier**: `Batch Verifier`
- **Closer**: `Commander`
- **Write-set**:
  - `platforms/mac/wrappers/01-开始部署.command`
  - `platforms/mac/wrappers/run-openclaw-usb.command`
  - `platforms/mac/wrappers/harden-openclaw-usb.command`
  - `platforms/mac/companion/start`
  - `platforms/mac/companion/stop`
  - `platforms/mac/companion/gateway`
  - `platforms/mac/companion/onboard`
  - `ui/server.mjs`（仅当 `A1` 已归因 divergence 落在 mac UI service binding surface 时）
  - `ui/public/index.html`（仅当 `A1` 已归因 divergence 落在 mac install / launcher binding surface 时）
  - `ui/public/dashboard.html`（仅当 `A1` 已归因 divergence 落在 mac dashboard / read-back / daemon binding surface 时）
- **Read-set**:
  - `specs/026-mac-first-platform-parity/spec.md`
  - `specs/026-mac-first-platform-parity/mac-truth-inventory.md`
  - `platforms/mac/wrappers/01-开始部署.command`
  - `platforms/mac/wrappers/run-openclaw-usb.command`
  - `platforms/mac/wrappers/harden-openclaw-usb.command`
  - `platforms/mac/companion/start`
  - `platforms/mac/companion/stop`
  - `platforms/mac/companion/gateway`
  - `platforms/mac/companion/onboard`
  - `ui/server.mjs`
  - `ui/public/index.html`
  - `ui/public/dashboard.html`
  - `specs/003-opensparrow-ui-reset-hardening/spec.md`
  - `specs/014-mac-arm64-installer-hardening/spec.md`（历史 spec 目录；不是当前 authority 中的 `F-014`）
- **Required checks**:
  - 不得为了“顺手统一”而超出 `A1` 已归因 surface；
  - 不得把 packaging 重整、archive 重建或 broader cleanup 混入当前 packet；
  - 若触达 UI surface，必须能说明它与 mac launcher / install / dashboard / read-back / daemon binding 的直接关系；
  - 不得改写 `F-003` / `F-014 = wecom-channel-integration` / `F-025-B` 的冻结状态，也不得把 `specs/014-mac-arm64-installer-hardening/` 升格成错误的 feature id。
- **Fresh verification evidence**:
  - macOS 主机上的 `bash -n` / shell 解析结果；
  - macOS 主机上的 launcher / companion / daemon / UI binding targeted commands、日志、截图、operator evidence；
  - 证据必须能一一对应 touched mac surface。
- **Done standard**:
  - `A1` 已归因的 mac direct user-path divergence 已被收口；
  - Commander 获得可追溯的 mac-specific implementation evidence；
  - 未完成项若存在，已被明确切回新的后续 packet，而不是混留在 `A2`。
- **Blocked standard**:
  - 若缺少 macOS-specific fresh evidence 无法证明当前 parity；
  - 若问题只能通过重开 `F-003` / `F-014 = wecom-channel-integration` / `F-025-B`、改写 `specs/014-mac-arm64-installer-hardening/` 的 package hardening 上游结论、broader docs parity、cleanup、package 重整或 containerization 才能继续推进。
- **Stop rule**:
  - 一旦修复开始扩成更广的 mac packaging、通用 UI 重构、schema 改造或旧 feature 重开，立即停包并回收边界。

## PKT-026-A3：mac verification-only closure

- **Goal**: 只做 mac-specific verification-only closure，并为 Commander 提供 `F-026` 的 close gate。
- **Scope**:
  - 只检查 `A1` / `A2` 产出的 macOS-specific fresh evidence；
  - 只检查 negative invariants、regressions 与 out-of-scope 是否仍成立；
  - 只在证据足够时允许 Commander 关闭 `F-026`。
- **Non-goals**:
  - 不承担新的实现写面；
  - 不做 broader docs parity；
  - 不做 callback / 自建应用增强专项；
  - 不做 schema migration、cleanup / refactor、package 重整或 containerization。
- **Owner**: `Batch Verifier`
- **Reviewer**: `SpecReviewer`
- **Verifier**: `Batch Verifier`
- **Closer**: `Commander`
- **Write-set**:
  - 无默认 repo write-set
- **Read-set**:
  - `specs/026-mac-first-platform-parity/spec.md`
  - `specs/026-mac-first-platform-parity/plan.md`
  - `specs/026-mac-first-platform-parity/tasks.md`
  - `specs/026-mac-first-platform-parity/mac-truth-inventory.md`
  - `platforms/mac/wrappers/01-开始部署.command`
  - `platforms/mac/wrappers/run-openclaw-usb.command`
  - `platforms/mac/wrappers/harden-openclaw-usb.command`
  - `platforms/mac/companion/start`
  - `platforms/mac/companion/stop`
  - `platforms/mac/companion/gateway`
  - `platforms/mac/companion/onboard`
  - `ui/server.mjs`
  - `ui/public/index.html`
  - `ui/public/dashboard.html`
- **Required checks**:
  - 只接受 macOS-specific fresh verification evidence；
  - 只检查 negative invariants：无 `F-003` / `F-014 = wecom-channel-integration` / `F-025` 重开、无把 `specs/014-mac-arm64-installer-hardening/` 写成真正 `F-014` 的 authority drift、无 broader docs parity、无 callback 扩战、无 schema/cleanup/containerization 扩战；
  - 不把历史 longrun、旧手工截图或非 macOS 推断当成本轮 close evidence。
- **Fresh verification evidence**:
  - 本轮在 macOS 主机重新执行的 targeted commands / targeted smoke / targeted shell checks；
  - 与 touched mac surface 一一对应的 fresh logs、screenshots、command output。
- **Done standard**:
  - Commander 获得可追溯的 mac-first close gate；
  - verifier 能明确陈述哪些事实已被 macOS-specific evidence 支撑、哪些内容继续留在 `F-026` 之外；
  - 不会误宣称 `F-025-B` 已 close，也不会误宣称整个 mac 体系已完成。
- **Blocked standard**:
  - 若 fresh verification evidence 不足；
  - 若验证发现问题需要新的实现写面或新的 feature packet。
- **Stop rule**:
  - 一旦 closure 需要补实现、补 broader docs、重开旧 feature、把 `specs/014-mac-arm64-installer-hardening/` 升格成 feature id，或改变 authority 文档，立即停包并切回新的 packet / Commander gate。
