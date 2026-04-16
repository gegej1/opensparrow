# Tasks: Mac-first Platform Parity

**Feature ID**: `F-026`  
**Input**: `specs/026-mac-first-platform-parity/spec.md`, `specs/026-mac-first-platform-parity/plan.md`  
**Dispatch rule**: packet-first、mac direct user-path only、保持 `F-003` / `F-014 = wecom-channel-integration` / `F-025` 只读冻结，且不得把 `specs/014-mac-arm64-installer-hardening/` 升格成当前 authority feature id。禁止把 broader docs parity、callback、自建应用增强、schema migration、cleanup / refactor、containerization 混进本轮。

## 派工前统一约束

- 先读：`AGENTS.md`、`.specify/memory/constitution.md`、`docs/governance/framework-stack.md`、`docs/项目持久化说明.md`
- `longrun/*` 只作项目记忆，不作 authority，不作本 feature write target
- `F-025-B` 继续保持 `blocked on Windows-specific evidence`，不 close，不并入 `F-026`
- 任何 worker 只能改自己 packet 的 write-set，不能跨包顺手扩张
- 所有 DONE / PASS / close 声明都必须依赖 macOS-specific fresh verification evidence
- noisy workspace 不能自动等于 scope 扩张，必须先做 packet attribution
- 任一 packet 若开始要求重开 `F-003`、`F-014 = wecom-channel-integration`、`F-025`，或把 `specs/014-mac-arm64-installer-hardening/` 写成当前 authority 中的 `F-014`，或要求 broader cleanup，立即停包并回到 Commander gate

---

## PKT-026-A1：mac truth inventory / divergence inventory

### T026-A1-1 — 盘点 mac direct user-path truth surface
- **Recommended owner**: `Worker-A`
- **Goal**: 把 mac current user-path 上的 launcher / companion / UI binding truth surface 与 divergence 盘成可派工 inventory。
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
- **Steps**:
  1. 区分 primary launcher、secondary wrapper、companion control、UI binding 四类 mac surface。
  2. 记录 launcher / shell / env / cwd / runtime path 差异。
  3. 记录 install / dashboard / read-back / daemon binding 差异。
  4. 标明哪些差异属于 `F-026`、哪些必须停在旧 feature / 新 feature gate 之外。
- **Checks**:
  - inventory 不把 broader docs parity、callback、schema、cleanup、containerization 混入；
  - inventory 不把 `F-003` / `F-014 = wecom-channel-integration` / `F-025` 冻结结论写成未定事项，也不把 `specs/014-mac-arm64-installer-hardening/` 写成真正的 `F-014`；
  - inventory 必须能直接支撑 `A2` 的实现边界与 `A3` 的 verification gate。
- **Fresh evidence required**:
  - 对 mac wrapper / companion / UI binding surface 的 fresh reread；
  - 来自 macOS 主机的 launcher / shell / service binding 归因证据；
  - 历史 longrun / handoff 只能做背景，不得单独支撑 DONE。
- **Done when**:
  - Commander 能据此直接派工 `A2` / `A3`；
  - 每个 divergence 都已归因到明确 surface，或已明确标为 `F-026` 外事项。
- **Blocked if**:
  - 没有 macOS-specific fresh evidence 就无法归因当前差异；
  - 问题本质落在 `F-003` / `F-014 = wecom-channel-integration` / `F-025-B`、`specs/014-mac-arm64-installer-hardening/` 的 package hardening 上游结论、broader docs parity、cleanup 或 package 重整。
- **Stop if**:
  - `A1` 需要修改 `spec.md / plan.md / tasks.md`；
  - `A1` 发现 design gap / authority gap，必须回到单独的 spec review / Commander gate；
  - inventory 开始演变成实现修复、全仓 cleanup 或旧 feature 重开。

---

## PKT-026-A2：mac wrapper / launcher / replay fidelity closure

### T026-A2-1 — 收口 mac direct user-path fidelity
- **Recommended owner**: `Worker-A`
- **Goal**: 只收口 `A1` 已归因的 mac launcher / companion / install / dashboard / read-back / daemon binding fidelity 差异。
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
- **Steps**:
  1. 只修 `A1` 已归因的 mac direct user-path divergence。
  2. 收口 `.command` / shell / env / cwd / runtime root 差异。
  3. 仅在必要时收口与 mac launcher / install / dashboard / read-back / daemon binding 直接相关的 UI surface。
  4. 保持 broader docs parity、package 重整、old feature reopening 都在当前 packet 之外。
- **Checks**:
  - 不得为了“顺手统一”而超出 `A1` 已归因 surface；
  - 不得把 packaging/archive 重整、callback、自建应用增强、schema、cleanup 写成当前 packet 目标；
  - 若触达 UI files，必须能说明它们与 mac direct user-path 的直接关系。
- **Fresh evidence required**:
  - macOS 主机上的 `bash -n` / shell 解析结果；
  - macOS 主机上的 launcher / companion / daemon / UI binding targeted commands、日志、截图、operator evidence；
  - 证据必须能一一对应 touched mac surface。
- **Done when**:
  - `A1` 已归因的 mac direct user-path divergence 已被收口；
  - Commander 获得可追溯的 mac-specific implementation evidence。
- **Blocked if**:
  - 缺少 macOS-specific fresh evidence 无法证明当前 parity；
  - 问题只能通过重开 `F-003` / `F-014 = wecom-channel-integration` / `F-025-B`、改写 `specs/014-mac-arm64-installer-hardening/` 的 package hardening 上游结论、broader docs parity、cleanup 或 package 重整继续推进。
- **Stop if**:
  - 修复开始扩成更广的 mac packaging、通用 UI 重构、schema 改造或旧 feature 重开。

---

## PKT-026-A3：mac verification-only closure

### T026-A3-1 — mac verification-only closure
- **Recommended owner**: `Batch Verifier`
- **Goal**: 只做 mac-specific verification-only closure，并给 Commander 提供 `F-026` close gate。
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
- **Steps**:
  1. 只检查 `A1` / `A2` 产出的 macOS-specific fresh evidence。
  2. 只检查 negative invariants：无 `F-003` / `F-014 = wecom-channel-integration` / `F-025` 重开、无把 `specs/014-mac-arm64-installer-hardening/` 写成真正 `F-014` 的 authority drift、无 broader docs parity、无 callback 扩战、无 schema/cleanup/containerization 扩战。
  3. 只在证据足够时允许 Commander 关闭 `F-026`。
- **Checks**:
  - 不把历史 longrun、旧手工截图或非 macOS 推断当成本轮 close evidence；
  - verification 不新增实现写面；
  - verification 必须明确哪些内容仍留在 `F-026` 之外。
- **Fresh evidence required**:
  - 本轮在 macOS 主机重新执行的 targeted commands / targeted smoke / targeted shell checks；
  - 与 touched mac surface 一一对应的 fresh logs、screenshots、command output。
- **Done when**:
  - Commander 获得可追溯的 mac-first close gate；
  - verifier 能明确陈述哪些事实已经被 macOS-specific evidence 支撑、哪些内容继续留在当前 feature 之外。
- **Blocked if**:
  - fresh verification evidence 不足；
  - 验证发现问题需要新的实现写面或新的 feature packet。
- **Stop if**:
  - closure 开始要求补实现、补 broader docs、重开旧 feature、把 `specs/014-mac-arm64-installer-hardening/` 升格成 feature id，或修改 authority 文档。
