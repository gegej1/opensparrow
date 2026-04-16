# Commander Plan: Channel Replay & Docs Parity

**Feature ID**: `F-025`  
**Feature Branch**: `025-channel-replay-doc-parity`  
**Date**: 2026-04-15  
**Spec**: `specs/025-channel-replay-doc-parity/spec.md`

## 战役摘要

F-025 不是重做 `F-024` 的 canonical contract baseline，也不是把 Windows fidelity、broader docs parity、cleanup 一口气打包。  
当前保持 `F-025-A = replay parity baseline` 只读冻结，并启动 `F-025-B = Windows replay fidelity` 的 design-only packet，用于把 Windows / PowerShell / 环境差异的范围、切包与关包 gate 先定义清楚。

### 为什么先只做 replay parity

`F-024` 已经冻结了 canonical contract baseline；`F-025-A` 的任务不是重新定义 contract，而是验证这些 baseline 在 replay 相关 surface 上没有漂移。

replay parity 先行的原因有三点：

1. replay 是 install / dashboard / read-back 三个 surface 的共同交点，最容易暴露 contract 漂移；
2. 先冻结 replay truth surface，后续 `F-025-B` 的 Windows fidelity 才有稳定基线；
3. 只做最小 docs parity，避免本轮被 broader docs parity、SOP 清扫或泛化 cleanup 拖偏。

## Packet 顺序与依赖

- `PKT-025-A0` 是整战入口，必须先完成并获 Commander 冻结；
- `PKT-025-A1` 只能在 `PKT-025-A0` 完成后启动；
- `PKT-025-A2` 只能在 `PKT-025-A1` 冻结 truth inventory 后启动；
- `PKT-025-A3` 只能在 `PKT-025-A2` 完成后启动；
- `PKT-025-A4` 只能在 `PKT-025-A3` 完成后启动，并作为 replay parity 的 verification-only closure packet；
- `PKT-025-A1/A2/A3/A4` 一旦被 Commander 接受，即构成 `F-025-A` 的只读 replay parity baseline；
- `PKT-025-B1` 只能在 `F-025-A` baseline 被视为只读 authority 后启动；
- `PKT-025-B2` 只能在 `PKT-025-B1` 冻结 Windows divergence inventory 后启动；
- `PKT-025-B3` 只能在 `PKT-025-B2` 完成后启动，并作为 Windows replay fidelity 的 verification-only closure packet；
- `F-025-C` 只保留边界，不在本轮开工；

---

## PKT-025-A0：spec freeze

- **Goal**: 冻结 `F-025-A = replay parity` 的 truth surface、packet 顺序、stop rule、owner / reviewer / verifier / closer 边界。
- **Scope**:
  - 确认 `F-025-A` 只覆盖 install replay、dashboard replay、read-back replay、minimal docs parity；
  - 明确 `F-024` canonical contract baseline 仍是 authority；
  - 预留 `F-025-B` / `F-025-C` 边界，但不进入 `F-025-A`；
  - 冻结 blocker-driven 小清理的唯一例外规则。
- **Non-goals**:
  - 不改运行时代码；
  - 不做 Windows replay fidelity；
  - 不做 broader docs parity；
  - 不做 callback / 自建应用增强链路专项扩战；
  - 不做动态表单引擎或 persisted schema 全迁移；
  - 不做泛化 cleanup / architecture refactor。
- **Owner**: `Design Agent`
- **Reviewer**: `Commander`
- **Verifier**: `Commander`
- **Closer**: `Commander`
- **Write-set**:
  - `specs/025-channel-replay-doc-parity/spec.md`
  - `specs/025-channel-replay-doc-parity/plan.md`
  - `specs/025-channel-replay-doc-parity/tasks.md`
- **Read-set**:
  - `AGENTS.md`
  - `.specify/memory/constitution.md`
  - `docs/governance/framework-stack.md`
  - `docs/runbooks/F-019-commander-orchestration-governance.md`
  - `specs/024-unified-channel-contract-baseline/spec.md`
  - `specs/024-unified-channel-contract-baseline/plan.md`
  - `specs/024-unified-channel-contract-baseline/tasks.md`
  - `docs/runbooks/F-024-unified-channel-contract-baseline.md`
  - `specs/025-channel-replay-doc-parity/spec.md`
- **Required checks**:
  - 阅读后必须能清楚说出 `F-025-A` 的 in-scope / out-of-scope；
  - 必须能明确 `F-025-B` / `F-025-C` 不进入 `F-025-A`；
  - 必须能指出 replay parity 与 canonical contract baseline 的关系；
  - 必须能指出允许的唯一清理例外是 blocker-driven 小清理。
- **Acceptance signals**:
  - Commander 能直接引用 `F-025-A` 边界给 worker 派工；
  - 任何人阅读文档都不会把 Windows fidelity、broader docs parity、cleanup 误当主线；
  - packet 顺序与角色边界足够清楚，后续可直接分发。
- **Stop rule**:
  - 一旦讨论开始演变成 Windows fidelity、broader docs parity、callback 专项扩战、动态表单引擎或泛化架构清理，立即停止并退回 `F-025-A` 边界。

## PKT-025-A1：replay truth inventory

- **Goal**: 列清三家 channel 在 install / dashboard / read-back replay surface 上的当前行为与目标 parity contract，形成 Commander 可派工的 truth inventory。
- **Scope**:
  - 盘点 Feishu / DingTalk / WeCom 在 replay 相关 surface 上的字段集合、requiredness tier、alias acceptance、persist / enrich 去向；
  - 对齐 install replay、dashboard replay、read-back replay 的 contract 解释；
  - 产出最小 parity matrix，明确哪些差异是事实差异，哪些是 wording 差异；
  - 保持 literal field name 可不同，但 contract 解释必须一致。
- **Non-goals**:
  - 不修实现；
  - 不扩成 Windows fidelity；
  - 不扩成 broader docs parity；
  - 不改 canonical baseline；
  - 不把 replay inventory 写成通用 schema 重构。
- **Owner**: `Worker-A`
- **Reviewer**: `SpecReviewer`
- **Verifier**: `Batch Verifier`
- **Closer**: `Commander`
- **Write-set**:
  - 只允许当前 packet 明确指定的 replay inventory 文档或 notes；
  - 若必须落盘，仍不得越出 `specs/025-channel-replay-doc-parity/`。
- **Read-set**:
  - `specs/025-channel-replay-doc-parity/spec.md`
  - `specs/024-unified-channel-contract-baseline/spec.md`
  - `specs/024-unified-channel-contract-baseline/plan.md`
  - `ui/server.mjs`
  - `ui/public/index.html`
  - `ui/public/dashboard.html`
  - `ui/lib/wecom.mjs`
  - `ui/public/wecom-helpers.js`
- **Required checks**:
  - parity matrix 可明确对应 install / dashboard / read-back 三个 surface；
  - inventory 不把 Windows 专项行为混进来；
  - inventory 不把 callback 增强链路写成本轮默认 gate；
  - 若存在 blocker，只能记录并止步，不能顺手做 cleanup。
- **Acceptance signals**:
  - Commander 能基于 inventory 拆出后续 server / browser 收口任务；
  - 三个 replay surface 的差异点被命名，而不是被模糊描述；
  - 允许后续按 packet 继续推进，但不要求本 packet 解决所有差异。
- **Stop rule**:
  - 如果 inventory 开始变成全面实现修复或 broader docs 扫描，立即停包。

## PKT-025-A2：server + read-back parity

- **Goal**: 先收 authoritative replay surface，确保 server-side replay 解释与 read-back 语义一致，再把结果留给 browser surface 对齐。
- **Scope**:
  - 统一 `/api/config`、`/api/config/channels`、以及相关 read-back enrichment 的 replay 语义；
  - 让 server 成为 replay authoritative surface；
  - 保留 `F-024` 的 canonical contract baseline，不反向改写；
  - 只修 replay 相关解释差异，不做 UI 大重构。
- **Non-goals**:
  - 不先改 install / dashboard 页面结构；
  - 不做 Windows fidelity；
  - 不做 broader docs parity；
  - 不做泛化 cleanup；
  - 不扩大到 callback / persisted schema 全迁移。
- **Owner**: `Worker-A`
- **Reviewer**: `SpecReviewer`
- **Verifier**: `Batch Verifier`
- **Closer**: `Commander`
- **Write-set**:
  - 只允许 `ui/server.mjs` 与其直接伴随的最小 helper / test 改动；
  - 不得跨越到无关模块。
- **Read-set**:
  - `specs/025-channel-replay-doc-parity/spec.md`
  - `specs/024-unified-channel-contract-baseline/spec.md`
  - `ui/server.mjs`
  - `ui/lib/wecom.mjs`
  - `ui/lib/channel-canonical.mjs`
- **Required checks**:
  - 定向验证 read-back 与 server 侧 replay 语义一致；
  - 明确 install / dashboard 尚未作为主改动面；
  - 确认未引入 Windows / broader docs / cleanup 外溢。
- **Acceptance signals**:
  - server-side replay authoritative surface 已冻结；
  - read-back 不再与 server 语义互相打架；
  - Commander 能据此推进 browser 对齐。
- **Stop rule**:
  - 若要先改 UI 才能说明 server 语义，说明 packet 切反了，立即停止。

## PKT-025-A3：install + dashboard replay parity + directly affected minimal docs parity

- **Goal**: 让 install / dashboard 两个 browser replay surface 与既有 authoritative replay contract 一致，并同步 directly affected minimal docs parity。
- **Scope**:
  - 对齐 install replay 与 dashboard replay 的字段加载、保存、回显、再提交行为；
  - 保持与 server/read-back 的 contract 解释一致；
  - 只同步 replay parity 直接影响到的最小 docs wording，不扩大到 broader docs parity；
  - 只修 replay 行为，不做页面重构；
  - 必要时允许 blocker-driven 小清理，但必须直接服务当前 packet。
- **Non-goals**:
  - 不做动态表单引擎；
  - 不改页面布局 / 样式 / 大量文案结构；
  - 不做 Windows fidelity；
  - 不做 broader docs parity；
  - 不把 replay 修复扩成全 UI cleanup。
- **Owner**: `Worker-A`
- **Reviewer**: `SpecReviewer`
- **Verifier**: `Batch Verifier`
- **Closer**: `Commander`
- **Write-set**:
  - `ui/public/index.html`
  - `ui/public/dashboard.html`
  - `ui/public/`
  - `specs/025-channel-replay-doc-parity/spec.md`
  - `specs/025-channel-replay-doc-parity/plan.md`
  - `specs/025-channel-replay-doc-parity/tasks.md`
- **Read-set**:
  - `specs/025-channel-replay-doc-parity/spec.md`
  - `specs/025-channel-replay-doc-parity/plan.md`
  - `specs/025-channel-replay-doc-parity/tasks.md`
  - `ui/public/index.html`
  - `ui/public/dashboard.html`
  - `ui/public/wecom-helpers.js`
  - `ui/server.mjs`
  - `docs/runbooks/F-024-unified-channel-contract-baseline.md`
  - `docs/runbooks/F-019-commander-orchestration-governance.md`
- **Required checks**:
  - install replay 与 dashboard replay 对同一 channel 的语义一致；
  - directly affected minimal docs wording 与 replay truth surface 一致；
  - 不把 Windows 专项 replay 逻辑提前并入；
  - 不把 broader docs parity 夹带进来；
  - 如有 blocker，只能做最小、可归因的小修。
- **Acceptance signals**:
  - 安装页与 Dashboard 对同一 contract 的 replay 解释不再分叉；
  - browser 侧与 server/read-back 侧不再互相矛盾；
  - directly affected minimal docs parity 已同步到位；
  - replay parity 的安装与 dashboard 面完成闭环。
- **Stop rule**:
  - 若开始要重写整页表单或引入 schema renderer，立即停包并退回 `F-025-A`。

## PKT-025-A4：verification-only closure

- **Goal**: 只做 verification-only closure，并为 Commander 提供关包所需的 fresh evidence 与边界确认。
- **Scope**:
  - 只检查 `PKT-025-A1/A2/A3` 产出的 fresh verification evidence；
  - 只检查 negative invariants：无 Windows 扩战、无 broader docs parity 扩战、无 cleanup 扩战；
  - 只为 Commander 提供 replay parity 的 closure gate；
  - 保持 `F-024` 与 `F-014` 已冻结边界不被重写。
- **Non-goals**:
  - 不做 minimal docs parity；
  - 不做任何新的实现写面；
  - 不做 Windows replay fidelity；
  - 不做 callback 扩战；
  - 不做泛化 cleanup。
- **Owner**: `Batch Verifier`
- **Reviewer**: `Commander`
- **Verifier**: `Batch Verifier`
- **Closer**: `Commander`
- **Write-set**:
  - 无默认 repo write-set
- **Read-set**:
  - `specs/025-channel-replay-doc-parity/spec.md`
  - `specs/025-channel-replay-doc-parity/plan.md`
  - `specs/025-channel-replay-doc-parity/tasks.md`
  - `ui/server.mjs`
  - `ui/public/index.html`
  - `ui/public/dashboard.html`
- **Required checks**:
  - verification 只围绕 replay parity，不扩成 broader docs parity；
  - 不把 Windows fidelity、callback 专项或 cleanup 写成已完成；
  - verification 只作为 closure，不接管新实现。
- **Acceptance signals**:
  - Commander 获得可追溯的 replay parity closure evidence；
  - Commander 能在不扩战的前提下关闭 `F-025-A`；
  - `F-025-B` / `F-025-C` 仍然保留为后续边界。
- **Stop rule**:
  - 如果 verification 开始要求新的实现写面或 docs 扩面，立即停止并切包。

---

## F-025-B 设计启动说明

- `F-025-B` 的一句话定义：只在不重开 `F-025-A` replay parity baseline 的前提下，收口 Windows replay fidelity、PowerShell 与 Windows 环境差异。
- `F-025-B` 相对 `F-025-A` 的新增 truth surface：
  - `platforms/windows/wrappers/*.cmd`
  - `platforms/windows/wrappers/*.ps1`
  - `platforms/windows/companion/*.ps1`
  - `scripts/openclaw-usb/*.ps1`
  - Windows 主机上的 install replay / dashboard replay / read-back replay fidelity evidence
  - `ui/public/channel-helpers.js`、`ui/lib/channel-canonical.mjs` 作为 replay shared surface / authority-adjacent surface；必须纳入 Windows fidelity divergence attribution 与 close gate read 面
- `F-025-B` 不包含 broader docs parity；tutorial / SOP / handoff 继续留给 `F-025-C`。
- 推荐最小 packet 数：`3`

## PKT-025-B1：Windows replay truth / divergence inventory

- **Goal**: 盘点 Windows replay fidelity 相对 `F-025-A` baseline 的新增 truth surface 与 divergence，并把 shell/env 差异与 replay 行为差异拆开。
- **Scope**:
  - 只盘点 Windows wrapper / companion / shared PowerShell surface；
  - 只盘点 Windows install replay / dashboard replay / read-back replay 相对 `F-025-A` baseline 的差异；
  - 必须做 packet attribution，不把 noisy workspace 直接记成越界。
- **Non-goals**:
  - 不修实现；
  - 不做 broader docs parity；
  - 不做 callback / 自建应用增强专项；
  - 不做 schema migration、cleanup 或架构重构。
- **Owner**: `Worker-B`
- **Reviewer**: `SpecReviewer`
- **Verifier**: `Batch Verifier`
- **Closer**: `Commander`
- **Write-set**:
  - `specs/025-channel-replay-doc-parity/replay-truth-inventory.md`
- **Read-set**:
  - `specs/025-channel-replay-doc-parity/replay-truth-inventory.md`
  - `platforms/windows/companion/*.ps1`
  - `platforms/windows/wrappers/*.cmd`
  - `platforms/windows/wrappers/*.ps1`
  - `scripts/openclaw-usb/*.ps1`
  - `ui/server.mjs`
  - `ui/public/index.html`
  - `ui/public/dashboard.html`
  - `ui/public/channel-helpers.js`
  - `ui/lib/channel-canonical.mjs`
- **Required checks**:
  - divergence inventory 必须区分 PowerShell / wrapper / env 差异与 replay 行为差异；
  - `ui/public/channel-helpers.js` 与 `ui/lib/channel-canonical.mjs` 必须作为 replay shared surface / authority-adjacent surface 纳入 divergence attribution；
  - 必须明确 `F-025-A` baseline 仍是只读 authority；
  - 不把 callback、自建应用增强链路、broader docs parity、schema/cleanup 混入。
- **Fresh verification evidence**:
  - 对当前 Windows wrapper / companion / shared `.ps1` truth surface，以及 `ui/public/channel-helpers.js` / `ui/lib/channel-canonical.mjs` 的 fresh reread；
  - 对现有 Windows 入口、命令路径与 replay 触发面的 fresh attribution notes；
  - 若已有 Windows 运行日志或截图，只能作为 divergence attribution 输入，不能单独构成 close evidence。
- **Done standard**:
  - Commander 获得可派工的 Windows divergence inventory；
  - 每个 divergence 都已归因到明确的 Windows surface 或明确标记为需新包判断；
  - 已冻结 `B2` 的实现边界与 `B3` 的 verification gate。
- **Blocked standard**:
  - 若差异在没有 Windows-specific fresh evidence 的前提下无法归因；
  - 若问题本质落到 broader docs parity、callback、schema 或 cleanup。
- **Stop rule**:
  - `B1` 不得修改 `spec.md / plan.md / tasks.md`；
  - 若发现 design gap / authority gap，必须停在 `B1` 并回到单独的 spec review / Commander gate；
  - 一旦 inventory 开始演变成实现修复、broader docs 扫描或 `F-025-A` 重开，立即停包。

## PKT-025-B2：Windows wrapper / companion / read-back fidelity 收口

- **Goal**: 在不扩战的前提下，收口 Windows wrapper / companion / PowerShell 与 install / dashboard / read-back 的 fidelity 差异。
- **Scope**:
  - 收口 PowerShell 参数传递、路径归一化、环境变量传播、encoding、exit code、working directory 等 Windows 专项差异；
  - 收口直接影响 Windows install replay、dashboard replay、read-back replay 的实现面；
  - 只修与 Windows fidelity 直接相关的 surface，不扩大到 broader docs parity。
- **Non-goals**:
  - 不重开 `F-025-A` baseline；
  - 不做 tutorial / SOP / handoff；
  - 不做 callback / 自建应用增强专项；
  - 不做 schema migration、动态表单引擎、cleanup 或架构重构。
- **Owner**: `Worker-B`
- **Reviewer**: `SpecReviewer`
- **Verifier**: `Batch Verifier`
- **Closer**: `Commander`
- **Write-set**:
  - `platforms/windows/companion/*.ps1`
  - `platforms/windows/wrappers/*.cmd`
  - `platforms/windows/wrappers/*.ps1`
  - `scripts/openclaw-usb/*.ps1`
  - `ui/server.mjs`
  - `ui/public/index.html`
  - `ui/public/dashboard.html`
  - `ui/public/wecom-helpers.js`
  - `ui/lib/wecom.mjs`
  - `ui/public/channel-helpers.js`（仅当 `B1` 已明确归因 divergence 落在该 shared replay surface 时）
  - `ui/lib/channel-canonical.mjs`（仅当 `B1` 已明确归因 divergence 落在该 authority-adjacent surface 时）
- **Read-set**:
  - `specs/025-channel-replay-doc-parity/spec.md`
  - `specs/025-channel-replay-doc-parity/replay-truth-inventory.md`
  - `platforms/windows/companion/*.ps1`
  - `platforms/windows/wrappers/*.cmd`
  - `platforms/windows/wrappers/*.ps1`
  - `scripts/openclaw-usb/*.ps1`
  - `ui/server.mjs`
  - `ui/public/index.html`
  - `ui/public/dashboard.html`
  - `ui/public/wecom-helpers.js`
  - `ui/lib/wecom.mjs`
  - `ui/public/channel-helpers.js`
  - `ui/lib/channel-canonical.mjs`
- **Required checks**:
  - Windows install replay / dashboard replay / read-back replay 的 contract 解释不得偏离 `F-025-A` baseline；
  - `ui/public/channel-helpers.js` 与 `ui/lib/channel-canonical.mjs` 只作为 replay shared surface / authority-adjacent surface 纳入归因与必要修复，不得做“预防性统一”；
  - 不把 broader docs parity、callback、自建应用增强、schema migration 或 cleanup 写成当前 packet 目标；
  - 任何 blocker 都必须能归因到 Windows-specific surface。
- **Fresh verification evidence**:
  - 来自 Windows 主机的 PowerShell 语法检查、dry-run、wrapper / companion 调用结果；
  - 来自 Windows 主机的 install replay / dashboard replay / read-back replay targeted smoke、日志、截图或命令输出；
  - 证据必须能直接对应本 packet touched Windows surface。
- **Done standard**:
  - Windows wrapper / companion / PowerShell 与 install / dashboard / read-back fidelity 已与 `F-025-A` baseline 对齐；
  - Commander 获得可追溯的 Windows-specific implementation evidence；
  - 未完成项若存在，已被明确切回新的后续 packet，而不是混留在当前包内。
- **Blocked standard**:
  - 若缺少 Windows-specific fresh evidence 无法证明 fidelity；
  - 若问题只能通过 broader docs parity、callback、自建应用增强、schema refactor 或 cleanup 继续推进。
- **Stop rule**:
  - 一旦修复开始扩成 broader docs、通用表单、全局 cleanup 或 `F-025-A` 重写，立即停包并回收边界。

## PKT-025-B3：Windows verification-only closure

- **Goal**: 只做 Windows replay fidelity 的 verification-only closure，并给 Commander 提供 close gate。
- **Scope**:
  - 只检查 `B1` / `B2` 产出的 Windows-specific fresh evidence；
  - 只检查 negative invariants、regressions 与 `F-025-C` 留白是否仍成立；
  - 只在证据足够时允许 Commander 关闭 `F-025-B`。
- **Non-goals**:
  - 不承担新的实现写面；
  - 不做 broader docs parity；
  - 不做 callback / 自建应用增强专项；
  - 不做 schema migration、cleanup 或架构重构。
- **Owner**: `Batch Verifier`
- **Reviewer**: `SpecReviewer`
- **Verifier**: `Batch Verifier`
- **Closer**: `Commander`
- **Write-set**:
  - 无默认 repo write-set
- **Read-set**:
  - `specs/025-channel-replay-doc-parity/spec.md`
  - `specs/025-channel-replay-doc-parity/plan.md`
  - `specs/025-channel-replay-doc-parity/tasks.md`
  - `platforms/windows/companion/*.ps1`
  - `platforms/windows/wrappers/*.cmd`
  - `platforms/windows/wrappers/*.ps1`
  - `scripts/openclaw-usb/*.ps1`
  - `ui/server.mjs`
  - `ui/public/index.html`
  - `ui/public/dashboard.html`
  - `ui/public/channel-helpers.js`
  - `ui/lib/channel-canonical.mjs`
- **Required checks**:
  - 只接受 Windows-specific fresh verification evidence；
  - 只检查 negative invariants：无 `F-025-A` 重开、无 broader docs parity、无 callback 扩战、无 schema/cleanup 扩战；
  - close gate 必须覆盖 `ui/public/channel-helpers.js` 与 `ui/lib/channel-canonical.mjs` 两个 shared authority-adjacent surface；
  - 不把历史 longrun、旧截图或非 Windows 推断当成本轮 close evidence。
- **Fresh verification evidence**:
  - 本轮在 Windows 主机重新执行的 targeted commands / targeted smoke / targeted tests；
  - 与 touched Windows surface 一一对应的 fresh logs、screenshots、command output。
- **Done standard**:
  - Commander 获得可追溯的 Windows replay fidelity close gate；
  - verifier 能明确陈述哪些事实已经被 Windows-specific evidence 支撑，哪些内容继续留给 `F-025-C`。
- **Blocked standard**:
  - 若 fresh verification evidence 不足；
  - 若验证发现问题需要新的实现写面或新的 feature packet。
- **Stop rule**:
  - 一旦 closure 需要补实现、补 broader docs 或重写边界，立即停包并切回新的 packet。
