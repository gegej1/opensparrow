# Tasks: Channel Replay & Docs Parity

**Feature ID**: `F-025`  
**Input**: `specs/025-channel-replay-doc-parity/spec.md`, `specs/025-channel-replay-doc-parity/plan.md`  
**Dispatch rule**: packet-first、minimum viable convergence、保持 `F-025-A = replay parity baseline` 只读冻结，并只启动 `F-025-B = Windows replay fidelity` 的 design-only packet。禁止把 `broader docs parity`、callback 扩战、动态表单引擎或泛化 cleanup 混进本轮。

## 派工前统一约束

- 先读：`AGENTS.md`、`.specify/memory/constitution.md`、`docs/governance/framework-stack.md`、`docs/runbooks/F-019-commander-orchestration-governance.md`
- 任何 worker 只能改自己 packet 的 write-set，不能跨包顺手扩张
- 先冻结 `PKT-025-A0`，后续包才能开工
- `PKT-025-A2` 必须先于 `PKT-025-A3`
- `PKT-025-A4` 只作为 verification-only closure packet 启动，不承担新的实现写面
- `F-025-A` 已完成的是 replay parity baseline，不在 `F-025-B` 中重开
- `F-025-B` 只负责 Windows replay fidelity / PowerShell / Windows 环境差异
- `F-025-C` 继续只保留给 broader docs parity / tutorial / SOP / handoff
- 所有完成声明都要带 fresh verification evidence
- 任一 packet 若开始依赖 Windows 专项环境、broader docs 扫描或泛化 cleanup，立即停包并回退到 `F-025-A` 边界

---

## PKT-025-A0：spec freeze

### T025-A0-1 — 冻结 replay parity truth surface
- **Recommended owner**: `Design Agent`
- **Goal**: 把 `F-025-A` 的 truth surface、packet 顺序、stop rule、角色边界一次性冻住。
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
- **Steps**:
  1. 明确 `F-025-A` 只覆盖 install replay、dashboard replay、read-back replay 与最小 docs parity。
  2. 明确 `F-024` canonical contract baseline 仍是 authority。
  3. 明确 `F-025-B` / `F-025-C` 只保留边界，不进入 `F-025-A`。
  4. 明确唯一允许的清理例外是 blocker-driven 小清理。
- **Checks**:
  - 文档中不存在 TODO/TBD/占位词；
  - 任何人阅读后都能复述 stop rule；
  - 不会把 replay parity 误读成 Windows fidelity 或 broader docs parity。
- **Done when**:
  - Commander 可以直接引用 spec/plan/tasks 给后续 worker 派工。
- **Stop if**:
  - 文档开始出现泛化 cleanup、动态表单引擎、callback 扩战或 Windows 专项主线。

---

## PKT-025-A1：replay truth inventory

### T025-A1-1 — 盘点三家 replay surface
- **Recommended owner**: `Worker-A`
- **Goal**: 把 Feishu / DingTalk / WeCom 在 install / dashboard / read-back replay surface 上的当前行为列清楚。
- **Write-set**:
  - 允许为本 packet 生成最小 truth inventory 文档或表格；
  - 不得越出 `specs/025-channel-replay-doc-parity/`。
- **Read-set**:
  - `specs/025-channel-replay-doc-parity/spec.md`
  - `specs/024-unified-channel-contract-baseline/spec.md`
  - `ui/server.mjs`
  - `ui/public/index.html`
  - `ui/public/dashboard.html`
  - `ui/lib/wecom.mjs`
  - `ui/public/wecom-helpers.js`
- **Steps**:
  1. 列出三家 channel 在 replay surface 的字段集合、requiredness tier、alias acceptance、persist / enrich 去向。
  2. 将 install replay、dashboard replay、read-back replay 分别写明。
  3. 记录事实差异与 wording 差异，不把两者混淆。
- **Checks**:
  - inventory 能独立回答“同一 contract 在三个 surface 上是否一致”；
  - inventory 不带 Windows / callback / cleanup 扩展面；
  - 若遇 blocker，只做记录，不顺手改实现。
- **Done when**:
  - Commander 能据此拆出 server / browser 后续包。
- **Stop if**:
  - inventory 开始变成修复计划或全面重构建议。

### T025-A1-2 — 形成最小 parity matrix
- **Recommended owner**: `Worker-A`
- **Goal**: 把 replay inventory 收成最小 parity matrix，明确哪些差异需要后续 packet 收口。
- **Write-set**:
  - 同上，仅限 `specs/025-channel-replay-doc-parity/`
- **Read-set**:
  - `specs/025-channel-replay-doc-parity/spec.md`
  - `specs/024-unified-channel-contract-baseline/spec.md`
- **Steps**:
  1. 按 install / dashboard / read-back 三列整理 parity matrix。
  2. 记录每个差异属于 contract、surface behavior 还是 docs wording。
  3. 标明哪些差异已被 `F-024` 冻结、哪些属于 `F-025-A` 需要继续处理。
- **Checks**:
  - matrix 不把 literal field name 误当 contract 差异；
  - matrix 不把 Windows / broader docs / cleanup 混入；
  - matrix 可直接成为后续 packet 输入。
- **Done when**:
  - Commander 可以直接从 matrix 决定是先 server 还是先 browser。
- **Stop if**:
  - matrix 写成了通用 schema 设计或动态表单建议。

---

## PKT-025-A2：server + read-back parity

### T025-A2-1 — 收口 authoritative replay surface
- **Recommended owner**: `Worker-A`
- **Goal**: 先统一 server-side replay 语义，再让 read-back 语义与之对齐。
- **Write-set**:
  - `ui/server.mjs`
  - 与 replay 语义直接相关的最小伴随 helper / test
- **Read-set**:
  - `specs/025-channel-replay-doc-parity/spec.md`
  - `specs/024-unified-channel-contract-baseline/spec.md`
  - `ui/server.mjs`
  - `ui/lib/channel-canonical.mjs`
  - `ui/lib/wecom.mjs`
- **Steps**:
  1. 冻结 `/api/config` 与 `/api/config/channels` 的 replay 语义。
  2. 让 server 成为 replay authoritative surface。
  3. 保留 `F-024` canonical baseline，不反向改写。
- **Checks**:
  - 定向验证 read-back 语义一致；
  - 定向验证没有把 install / dashboard 提前拉进来；
  - 定向验证不依赖 Windows / broader docs / cleanup。
- **Done when**:
  - server 与 read-back 解释同一 contract 的方式已一致。
- **Stop if**:
  - 需要先重做 UI 才能解释 server 语义。

### T025-A2-2 — 记录 server/read-back 关闭点
- **Recommended owner**: `Worker-A`
- **Goal**: 把 server/read-back 的 replay 收口点整理成后续 browser 对齐输入。
- **Write-set**:
  - 仅限当前 packet 的 replay parity notes / docs
- **Read-set**:
  - `specs/025-channel-replay-doc-parity/spec.md`
  - `ui/server.mjs`
- **Steps**:
  1. 记录已一致的语义。
  2. 记录仍待 browser 对齐的语义。
  3. 明确哪些是 blocker-driven 小清理，哪些不能在本包处理。
- **Checks**:
  - 关闭点清晰可复用；
  - 不引入新的实现范围。
- **Done when**:
  - Commander 拿到可以直接派给 browser 包的 closure note。
- **Stop if**:
  - notes 开始演变成 broader docs 说明或架构审视。

---

## PKT-025-A3：install + dashboard replay parity + directly affected minimal docs parity

### T025-A3-1 — 对齐安装页 replay
- **Recommended owner**: `Worker-A`
- **Goal**: 让安装页的 replay / 回填 / 再提交语义与已冻结 contract 一致。
- **Write-set**:
  - `ui/public/index.html`
  - `ui/public/`
- **Read-set**:
  - `specs/025-channel-replay-doc-parity/spec.md`
  - `ui/public/index.html`
  - `ui/public/wecom-helpers.js`
  - `ui/server.mjs`
- **Steps**:
  1. 对齐字段加载与保存 replay 语义。
  2. 对齐 install replay 的回显语义。
  3. 只做 replay 相关收口，不做页面重构。
- **Checks**:
  - 安装页与 server/read-back 不再互相打架；
  - 没有引入 Windows / broader docs / cleanup；
  - 如有 blocker，只做最小、可归因的小修。
- **Done when**:
  - 安装页 replay 行为与 contract 一致。
- **Stop if**:
  - 需要重写整页结构或引入 schema renderer。

### T025-A3-2 — 对齐 Dashboard replay
- **Recommended owner**: `Worker-A`
- **Goal**: 让 Dashboard replay 与安装页 / server 的 replay 语义保持一致。
- **Write-set**:
  - `ui/public/dashboard.html`
  - `ui/public/`
- **Read-set**:
  - `specs/025-channel-replay-doc-parity/spec.md`
  - `ui/public/dashboard.html`
  - `ui/public/wecom-helpers.js`
  - `ui/server.mjs`
- **Steps**:
  1. 对齐 dashboard modal 的加载、保存、回显、再提交语义。
  2. 保持与 install replay 一致的 contract 解释。
  3. 保持页面布局不变，避免泛化 cleanup。
- **Checks**:
  - Dashboard 与安装页对同一 contract 的 replay 解释一致；
  - 没有偷带 broader docs 或 Windows fidelity；
  - 不改成通用表单引擎。
- **Done when**:
  - Browser 侧 replay parity 闭环完成。
- **Stop if**:
  - 任务开始演变成 Dashboard 大改造。

### T025-A3-3 — 同步 directly affected minimal docs wording
- **Recommended owner**: `Worker-A`
- **Goal**: 只同步 replay parity 直接影响到的最小 docs wording，并保持 `F-025-A` 完成边界清楚。
- **Write-set**:
  - `specs/025-channel-replay-doc-parity/spec.md`
  - `specs/025-channel-replay-doc-parity/plan.md`
  - `specs/025-channel-replay-doc-parity/tasks.md`
- **Read-set**:
  - `docs/runbooks/F-024-unified-channel-contract-baseline.md`
  - `docs/runbooks/F-019-commander-orchestration-governance.md`
  - `specs/025-channel-replay-doc-parity/spec.md`
  - `specs/025-channel-replay-doc-parity/plan.md`
  - `specs/025-channel-replay-doc-parity/tasks.md`
- **Steps**:
  1. 只同步 replay parity 直接影响面中的最小 wording。
  2. 明确 `F-025-A` 完成边界。
  3. 保留 `F-025-B` / `F-025-C` 边界，不提前并入。
- **Checks**:
  - wording 不扩大为 broader docs parity；
  - 不把 Windows fidelity、callback 扩战或 cleanup 写成已完成；
  - 只做 replay parity 直接影响面同步。
- **Done when**:
  - 直接受影响 docs 与 replay truth surface 一致。
- **Stop if**:
  - 开始扫描全仓文档或顺手整理教程体系。

---

## PKT-025-A4：verification-only closure

### T025-A4-1 — verification-only closure
- **Recommended owner**: `Batch Verifier`
- **Goal**: 只做 verification closure，不接管新实现。
- **Write-set**:
  - 无默认 repo write-set
- **Read-set**:
  - `specs/025-channel-replay-doc-parity/spec.md`
  - `specs/025-channel-replay-doc-parity/plan.md`
  - `specs/025-channel-replay-doc-parity/tasks.md`
  - `ui/server.mjs`
  - `ui/public/index.html`
  - `ui/public/dashboard.html`
- **Steps**:
  1. 只检查 fresh verification evidence。
  2. 只检查 negative invariants：无 Windows 扩战、无 broader docs 扩战、无 cleanup 扩战。
  3. 只在证据足够时允许 Commander 关包。
- **Checks**:
  - verification 不改实现；
  - verification 不把 replay parity 之外的内容算入完成度；
  - verification 必须能单独说明边界。
- **Done when**:
  - Commander 可基于证据决定是否关闭 `F-025-A`。
- **Stop if**:
  - 验证中发现缺陷则新开 packet，不在本包补实现。

---

## F-025-B：Windows replay fidelity

- **一句话定义**: 只在不重开 `F-025-A` replay parity baseline 的前提下，收口 Windows replay fidelity、PowerShell 与 Windows 环境差异。
- **新增 truth surface**:
  - `platforms/windows/companion/*.ps1`
  - `platforms/windows/wrappers/*.cmd`
  - `platforms/windows/wrappers/*.ps1`
  - `scripts/openclaw-usb/*.ps1`
  - Windows 主机上的 install replay / dashboard replay / read-back replay fidelity evidence
  - `ui/public/channel-helpers.js`、`ui/lib/channel-canonical.mjs` 作为 replay shared surface / authority-adjacent surface；必须纳入 Windows fidelity divergence attribution 与 close gate read 面
- **推荐最小 packet 数**: `3`
- **必须留给 F-025-C**:
  - broader docs parity
  - tutorial / walkthrough
  - runbook 全面修订
  - handoff / SOP 清扫

## PKT-025-B1：Windows replay truth / divergence inventory

### T025-B1-1 — 盘点 Windows replay truth / divergence
- **Recommended owner**: `Worker-B`
- **Goal**: 把 Windows replay fidelity 相对 `F-025-A` baseline 的新增 truth surface 与 divergence 盘成可派工 inventory。
- **Write-set**:
  - `specs/025-channel-replay-doc-parity/replay-truth-inventory.md`
- **Read-set**:
  - `platforms/windows/companion/*.ps1`
  - `platforms/windows/wrappers/*.cmd`
  - `platforms/windows/wrappers/*.ps1`
  - `scripts/openclaw-usb/*.ps1`
  - `specs/025-channel-replay-doc-parity/replay-truth-inventory.md`
  - `ui/server.mjs`
  - `ui/public/index.html`
  - `ui/public/dashboard.html`
  - `ui/public/channel-helpers.js`
  - `ui/lib/channel-canonical.mjs`
- **Steps**:
  1. 先把 Windows shell/env 差异与 replay 行为差异拆开。
  2. 明确哪些属于 wrapper/PowerShell，哪些属于 replay surface 本身。
  3. 把 `ui/public/channel-helpers.js` 与 `ui/lib/channel-canonical.mjs` 作为 replay shared surface / authority-adjacent surface 纳入 divergence attribution。
  4. 明确哪些可进入 `B2`，哪些必须切新包或后置到 `F-025-C`。
  5. 保持 `F-025-A` baseline 只读，不反向改写。
- **Checks**:
  - inventory 不把 broader docs parity、callback、schema/cleanup 混入；
  - inventory 不把 noisy workspace 直接记成当前 packet 越界；
  - inventory 必须能支撑 `B2` 的实现边界与 `B3` 的 verification gate。
- **Fresh evidence required**:
  - 对 Windows wrapper / companion / shared `.ps1` surface，以及 `ui/public/channel-helpers.js` / `ui/lib/channel-canonical.mjs` 的 fresh reread；
  - 对 Windows 入口命令与 replay 触发面的 fresh attribution notes；
  - 若使用历史截图或旧日志，只能做背景，不得单独支撑 DONE。
- **Done when**:
  - Commander 能直接据此派工 `B2` / `B3`；
  - 每个 divergence 都已归因到明确的 Windows surface，或已被明确标记为需新包判断。
- **Blocked if**:
  - 没有 Windows fresh evidence 就无法区分 shell/env 与 replay 行为差异；
  - 问题本质落在 broader docs parity、callback、schema 或 cleanup。
- **Stop if**:
  - `B1` 不得修改 `spec.md / plan.md / tasks.md`；
  - 若发现 design gap / authority gap，必须停在 `B1` 并回到单独的 spec review / Commander gate；
  - inventory 开始演变成实现修复、全仓 docs 扫描或 `F-025-A` 重开。

## PKT-025-B2：Windows wrapper / companion / read-back fidelity 收口

### T025-B2-1 — 收口 Windows fidelity 实现面
- **Recommended owner**: `Worker-B`
- **Goal**: 收口 Windows wrapper / companion / PowerShell 与 install / dashboard / read-back 的 fidelity 差异。
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
- **Steps**:
  1. 收口 PowerShell 参数传递、路径归一化、环境变量传播。
  2. 收口 encoding、exit code、working directory 等 Windows 专项差异。
  3. 收口直接影响 Windows install replay、dashboard replay、read-back replay 的实现面。
  4. 只处理 Windows fidelity 直接相关 surface，不扩大到 broader docs parity。
- **Checks**:
  - 不把 broader docs parity 写成当前 packet 目标；
  - `ui/public/channel-helpers.js` 与 `ui/lib/channel-canonical.mjs` 只在 `B1` 已明确归因时允许触达；否则不得为了“预防性统一”而顺手修改；
  - 不把 callback、自建应用增强、schema migration 或 cleanup 写成当前 packet 目标；
  - 证据必须来自 Windows 环境。
- **Fresh evidence required**:
  - Windows 主机上的 PowerShell 语法检查、dry-run、wrapper / companion 调用结果；
  - Windows 主机上的 install replay / dashboard replay / read-back replay targeted smoke、日志、截图或命令输出；
  - 证据必须能一一对应 touched Windows surface。
- **Done when**:
  - Windows wrapper / companion / PowerShell 与 install / dashboard / read-back fidelity 已与 `F-025-A` baseline 对齐；
  - Commander 获得可追溯的 Windows-specific implementation evidence。
- **Blocked if**:
  - 缺少 Windows-specific fresh evidence 无法证明 fidelity；
  - 问题只能通过 broader docs parity、callback、自建应用增强、schema refactor 或 cleanup 继续推进。
- **Stop if**:
  - 修复开始扩成 broader docs、通用表单、全局 cleanup 或 `F-025-A` 重写。

## PKT-025-B3：Windows verification-only closure

### T025-B3-1 — Windows verification-only closure
- **Recommended owner**: `Batch Verifier`
- **Goal**: 只做 Windows replay fidelity 的 verification-only closure，并给 Commander 提供 close gate。
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
- **Steps**:
  1. 只检查 `B1` / `B2` 产出的 Windows-specific fresh evidence。
  2. 只检查 negative invariants：无 `F-025-A` 重开、无 broader docs parity、无 callback 扩战、无 schema/cleanup 扩战。
  3. 只在证据足够时允许 Commander 关闭 `F-025-B`。
- **Checks**:
  - 不把历史 longrun、旧截图或非 Windows 推断当完成证据；
  - verification 不新增实现写面；
  - close gate 必须覆盖 `ui/public/channel-helpers.js` 与 `ui/lib/channel-canonical.mjs` 两个 shared authority-adjacent surface；
  - verification 必须能明确哪些内容继续留给 `F-025-C`。
- **Fresh evidence required**:
  - 本轮在 Windows 主机重新执行的 targeted commands / targeted smoke / targeted tests；
  - 与 touched Windows surface 一一对应的 fresh logs、screenshots、command output。
- **Done when**:
  - Commander 获得可追溯的 Windows replay fidelity close gate；
  - verifier 能明确陈述哪些事实已经被 Windows-specific evidence 支撑，哪些内容继续留给 `F-025-C`。
- **Blocked if**:
  - fresh verification evidence 不足；
  - 验证发现问题需要新的实现写面或新的 feature packet。
- **Stop if**:
  - closure 开始要求补实现、补 broader docs 或重写边界。

## F-025-B 的 fresh verification evidence

- Windows 主机上的 PowerShell 语法检查与 dry-run
- Windows 主机上的 wrapper / companion 调用结果
- Windows 主机上的 install replay / dashboard replay / read-back replay targeted smoke
- 能直接对应 touched Windows surface 的 fresh logs / screenshots / command output
