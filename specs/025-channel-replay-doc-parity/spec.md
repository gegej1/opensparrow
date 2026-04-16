# Feature Specification: Channel Replay & Docs Parity

**Feature ID**: `F-025`  
**Feature Branch**: `025-channel-replay-doc-parity`  
**Created**: 2026-04-15  
**Status**: In Progress  
**Input**: 基于已完成的 `F-024 unified-channel-contract-baseline`，继续推进紧随其后的下一战。`F-024` 已经冻结了 Feishu / DingTalk / WeCom 的 canonical contract baseline，并明确把 replay parity、Windows replay fidelity、broader docs parity 留给 `F-025`。本 feature 不回退去重做 contract baseline，也不借机做泛化 cleanup；当前保持 `F-025-A = replay parity baseline` 只读冻结，并启动 `F-025-B = Windows replay fidelity` 的 design-only packet。

## Context & References

### 仓库约束
- `AGENTS.md`
- `.specify/memory/constitution.md`
- `docs/governance/framework-stack.md`
- `docs/runbooks/F-019-commander-orchestration-governance.md`
- `longrun/workspaces/opensparrow-unified/feature_list.json`
- `longrun/workspaces/opensparrow-unified/claude-progress.txt`

### Replay parity 直接相关 surfaces
- `ui/public/index.html`
- `ui/public/dashboard.html`
- `ui/server.mjs`
- `ui/lib/wecom.mjs`
- `ui/public/wecom-helpers.js`

### 已完成的上游基线
- `specs/024-unified-channel-contract-baseline/spec.md`
- `specs/024-unified-channel-contract-baseline/plan.md`
- `specs/024-unified-channel-contract-baseline/tasks.md`
- `docs/runbooks/F-024-unified-channel-contract-baseline.md`
- `specs/011-wecom-channel-integration/spec.md`
- `specs/004-dingtalk-stream-win-parity/spec.md`

### 当前 carryover 事实
- `F-024` 已通过，但该 passing 仅对应 canonical contract baseline，不等于 full replay parity。
- `F-014` 已通过，但该 passing 仅覆盖 WeCom bot-first 长连接主链，不等于 callback / 自建应用增强链路全部通过。
- `F-025` 必须继续尊重 `F-024` 与 `F-014` 已冻结的 truth surface，不能借 replay parity 反向改写 baseline contract。

## 为什么做 F-025

`F-024` 解决的是“canonical contract baseline 是否统一”；`F-025` 要解决的是“这些 baseline 在 replay 相关 surface 上是否真的一致且可追溯”。

当前主要矛盾不是三家 channel 没功能，而是：

1. **同一 contract 在 replay 相关 surface 上仍可能漂移**
   - install replay、dashboard replay、read-back replay 对同一字段的 requiredness、alias、回显语义可能仍不完全一致。
2. **F-024 只同步了最小直接受影响 wording**
   - 更广的 replay 说明、handoff、教程、SOP parity 还没进入正式战役。
3. **Windows replay fidelity 仍是独立债项**
   - 它与 replay parity 相关，但不应在 `F-025-A` 中提前吞并。

## 战役拆分

`F-025` 不是单包 feature，而是一个多子战战役：

- **`F-025-A = replay parity`**
  - 已冻结为 replay parity baseline；不在 `F-025-B` 中重开。
- **`F-025-B = Windows replay fidelity`**
  - 当前 design-only focus；只处理 Windows replay fidelity、PowerShell 与 Windows 环境差异。
- **`F-025-C = broader docs parity`**
  - 最后再做更大范围教程、runbook、handoff、SOP 的 broader docs parity。

本 spec 当前保持 **`F-025-A`** 为已冻结 baseline，并只启动 **`F-025-B`** 的 design-only packet。`F-025-C` 继续只在边界中预留，不进入本轮。

## F-025-B 上游冻结事实

### F-024 冻结口径

- `F-024` 已完成的是 canonical contract baseline。
- 这不等于真实 E2E、Windows replay fidelity、broader docs parity 已全部完成。
- `F-025` 仍是 replay parity / docs parity 的后续战役。

### F-014 冻结口径

- 企业微信当前业务主链仍是 bot-first long-connection。
- 最小真实入口仍是 `Bot ID + Secret`。
- callback / 自建应用增强字段不是默认 passing 门槛。
- callback 只能表述为增强链路 / 特定业务场景链路。
- `F-025-B` 不得把 callback 反写成 `F-014` 默认 blocking gate。

### F-025-A 冻结口径

- `F-025-A = replay parity baseline` 已完成并 closed。
- `A1 inventory` 已冻结。
- `A2 server/read-back parity` 已完成。
- `A3 browser replay parity + directly affected minimal docs parity` 已完成。
- `A4 verification-only closure` 已完成。
- `F-025-A` 已关包，但整个 `F-025` 仍未完成。
- `F-025-B` 不得重开 `F-025-A`，也不得把 Windows fidelity 或 broader docs parity 反写成 `F-025-A` 已完成事实。

## F-025-A Scope

### In Scope (`F-025-A`)
1. 冻结 replay parity 的 truth surface，只覆盖：
   - install replay
   - dashboard replay
   - read-back replay
   - 与这三者直接相关的最小 docs parity
2. 列清 Feishu / DingTalk / WeCom 在上述 replay surface 上当前行为与目标 parity contract。
3. 让 server-side replay authoritative surface 与 browser-side replay surface 对同一 contract 的解释一致。
4. 只同步 replay parity 直接影响到的最小 docs / live-spec / runbook wording。
5. 为 Commander 形成可 packetized rollout 的实现与验证边界。

### Out of Scope (`F-025-A`)
- Windows replay fidelity 的全量收口。
- broader docs parity / 全 docs 大扫除。
- 真实凭据 E2E 扩战。
- callback / 自建应用增强链路专项扩战。
- 动态表单引擎。
- persisted schema 全迁移。
- 泛化 cleanup / architecture refactor。
- 任何与 `F-025-A` 无直接阻塞关系的“顺手清理”。

## Replay Parity 的定义

本轮不把“replay”理解为真实外部环境全量回放，也不等于 Windows fidelity。  
`F-025-A` 中的 **replay parity** 定义为：

> 对同一 channel contract，install、dashboard、read-back 三个 replay 相关 surface 在字段集合、requiredness tier、alias 接受、persist / enrich 去向、以及面向文档的表述上保持一致且可验证。

### 只统一三层
1. **Install replay surface**
   - 安装向导对字段的 replay / 回填 / 再提交行为。
2. **Dashboard replay surface**
   - Dashboard modal 对字段的加载、编辑、保存、回显行为。
3. **Read-back replay surface**
   - `/api/config`、`/api/config/channels`、以及 UI enrichment 对 channel config 的读取与回填语义。

本轮不增加第四层抽象，也不要求把三家 channel 压成同一组 literal field names。

## 当前 F-025-A 的关键边界

### Boundary 1 — 不回退 F-024 baseline
- `F-024` 冻结的 canonical contract 仍然是 authority。
- `F-025-A` 只能围绕 replay parity 做收口，不能反向重写 baseline contract。

### Boundary 2 — 不提前吃 Windows fidelity
- 若某个问题只有在 Windows 专项环境中才能继续判断，则它属于 `F-025-B`，必须停止并切包。

### Boundary 3 — 不扩成 broader docs parity
- 本轮 docs 只同步 replay parity 直接影响面。
- 更广的教程 / runbook / SOP / handoff 清扫属于 `F-025-C`。

### Boundary 4 — 只允许 blocker-driven 小清理
- 若某个极小历史包袱直接阻塞 `F-025-A`，可以单开小 packet 做局部清理。
- 该清理必须：
  - 直接服务当前 packet
  - 写面小
  - 可独立验证
  - 不扩散成泛化重构

## F-025-B 一句话定义

`F-025-B = 在不重开 F-025-A replay parity baseline 的前提下，只收口 Windows replay fidelity、PowerShell 与 Windows 环境差异。`

## F-025-B 相对 F-025-A 的新增 truth surface

`F-025-B` 不新增新的 channel contract，也不重写 `F-025-A` 的 replay parity baseline；它只新增以下 Windows 专项 truth surface：

1. **Windows wrapper / companion truth surface**
   - `platforms/windows/wrappers/*.cmd`
   - `platforms/windows/wrappers/*.ps1`
   - `platforms/windows/companion/*.ps1`
   - `scripts/openclaw-usb/*.ps1`
   - 关注点：PowerShell 参数传递、路径归一化、环境变量传播、exit code、编码与 working directory 行为。
2. **Windows replay execution truth surface**
   - 在 Windows 主机上执行 install replay、dashboard replay、read-back replay 时的 shell / process / browser 差异。
   - 关注点：同一 replay baseline 在 Windows 环境下是否仍然稳定成立。
3. **Windows fidelity evidence surface**
   - 仅接受来自 Windows 环境的 fresh verification evidence。
   - 历史截图、旧 runbook、旧 longrun 记录只能做背景，不构成 `F-025-B` 完成证据。
4. **Replay shared / authority-adjacent read surface**
   - `ui/public/channel-helpers.js`
   - `ui/lib/channel-canonical.mjs`
   - 角色：它们属于 replay shared surface / authority-adjacent surface；`F-025-B` 必须把它们纳入 Windows fidelity divergence attribution 与 close gate read 面。

## F-025-B Scope

### In Scope (`F-025-B`)
1. 冻结 Windows replay fidelity 的 truth surface，只覆盖：
   - Windows PowerShell / `.cmd` wrapper / companion 行为
   - Windows 环境下的 install replay
   - Windows 环境下的 dashboard replay
   - Windows 环境下的 read-back replay
2. 盘点 Windows fidelity 相对 `F-025-A` baseline 的新增差异，不反向改写 `F-025-A` 已通过结论。
3. 把 Windows shell / process / env 差异与 replay 行为差异拆开，避免混成 broader cleanup。
4. 为 Commander 形成最小可派工的 Windows fidelity packet 切分与关包 gate。

### Out of Scope (`F-025-B`)
- broader docs parity / tutorial / SOP / handoff。
- callback / 自建应用增强链路专项收口。
- 动态表单引擎。
- persisted schema 全迁移。
- 泛化 cleanup / architecture refactor。
- 把 noisy workspace 直接当作 `F-025-B` 当前 packet 越界。

## Windows Replay Fidelity 的定义

本轮不把 `F-025-B` 理解为“Windows 全平台完美交付”，也不等于全 docs parity。  
`F-025-B` 中的 **Windows replay fidelity** 定义为：

> 在保持 `F-025-A` replay parity baseline 不变的前提下，同一 replay contract 在 Windows PowerShell / wrapper / companion / Windows 环境中仍能被一致执行、回显并被 fresh evidence 证明。

## Fresh Verification Evidence (`F-025-B`)

以下证据才算 `F-025-B` 的 fresh verification evidence：

- 来自 Windows 主机的 PowerShell 语法检查、dry-run、wrapper 调用结果；
- 来自 Windows 主机的 install replay / dashboard replay / read-back replay 定向命令输出；
- 来自 Windows 主机的 targeted smoke、targeted tests、日志、截图；
- 能直接对应本轮 touched Windows surface 的 fresh command output。

以下内容不算 `F-025-B` 完成证据：

- 历史 longrun 记录；
- 非 Windows 主机上的推断性验证；
- broader docs parity 的文案同步；
- callback / schema / cleanup 的顺手结果。

## F-025-B 推荐最小 packet 切分

1. **`PKT-025-B1 = Windows replay truth / divergence inventory`**
   - 只负责把 Windows shell / env / wrapper 差异与 replay 行为差异拆清楚，并冻结成可派工 inventory。
   - 只允许产出 packet-local inventory artifact（优先 `specs/025-channel-replay-doc-parity/replay-truth-inventory.md`）；若发现 design gap / authority gap，必须停在 `B1` 并回到 spec review / Commander gate，不得改 `spec.md / plan.md / tasks.md`。
2. **`PKT-025-B2 = Windows wrapper / companion / read-back fidelity 收口`**
   - 只负责 Windows wrapper / companion / PowerShell / install / dashboard / read-back fidelity 的直接收口，不扩大到 broader docs parity。
   - 仅当 `B1` 已明确归因 divergence 落在 `ui/public/channel-helpers.js` 或 `ui/lib/channel-canonical.mjs` 时，`B2` 才允许触达这些 shared surface；否则不得为了“预防性统一”而顺手修改。
3. **`PKT-025-B3 = Windows verification-only closure`**
   - 只负责 Windows-specific fresh evidence、negative invariants 与 Commander close gate，不承担新的实现写面。
   - close gate 的 read 面必须覆盖 `ui/public/channel-helpers.js` 与 `ui/lib/channel-canonical.mjs`。

## 必须留给 F-025-C 的内容

以下内容必须继续留给 `F-025-C`，不得在 `F-025-B` 偷渡：

- broader docs parity；
- tutorial / walkthrough / onboarding 文案；
- runbook 全面修订；
- handoff / SOP / 教程体系清扫；
- 任何超出 Windows replay fidelity 直接阻塞面的文档扩写。

## User Stories & Testing

### User Story 1 - Commander 需要冻结 replay parity 的 truth surface（Priority: P1)

作为 Commander，我希望仓库里存在一个正式的 `F-025-A` spec / plan / tasks，用来冻结 replay parity 的 scope、stop rule、packet 顺序与验收口径，这样后续派工不会把 Windows fidelity、broader docs parity 或 cleanup 偷带进来。

**Independent Test**: 阅读 `spec / plan / tasks` 后，能明确看出 `F-025-A` 只负责 replay parity，且任何超出 replay parity 的工作都会被 stop rule 挡住。

### User Story 2 - 三渠道 replay surface 需要对同一 contract 保持一致（Priority: P1)

作为维护 install / dashboard / read-back 的开发者，我希望三家 channel 在 replay 相关 surface 上对同一 contract 的字段集合、requiredness、alias、persist / enrich 去向保持一致，这样我不用在页面、read-back 与文档间来回猜语义。

**Independent Test**: 对同一 channel 的 replay truth inventory 进行核对时，install / dashboard / read-back 不再互相冲突；针对 replay parity 的 targeted tests / smoke 能覆盖这些一致性。

### User Story 3 - 最小 docs parity 需要只跟随 replay truth surface（Priority: P2)

作为交接协作者，我希望最小直接受影响文档只跟随 replay parity truth surface，而不是借本轮机会做 broader docs parity，这样 longrun、runbook 与教程不会再超范围承诺。

**Independent Test**: 直接受影响的 docs wording 与 replay parity contract 一致，且没有任何文档把 Windows replay fidelity、callback 增强链路或全 docs parity 写成 `F-025-A` 已完成。

### User Story 4 - Commander 需要把 Windows fidelity 与 replay baseline 分开派工（Priority: P1)

作为 Commander，我希望 `F-025-B` 明确只覆盖 Windows replay fidelity / PowerShell / Windows 环境差异，这样后续派工不会重开 `F-025-A`，也不会把 broader docs parity、callback 专项或 schema/cleanup 偷带进来。

**Independent Test**: 阅读 `spec / plan / tasks` 后，能明确看出 `F-025-B` 相对 `F-025-A` 只新增 Windows truth surface，并且 packet 切分不会把 `F-025-C` 内容并入。

## Requirements

### Functional Requirements

- **FR-001**: 必须为 `F-025` 维护正式 `spec.md`、`plan.md`、`tasks.md`，并明确 `F-025-A` 已冻结为 replay parity baseline、当前只启动 `F-025-B` 的 design-only packet。
- **FR-002**: `F-025-A` 必须只覆盖 install replay、dashboard replay、read-back replay，以及与其直接相关的最小 docs parity。
- **FR-003**: 必须冻结 replay parity 的 truth surface，明确三家 channel 在 replay 相关 surface 上的 field inventory、requiredness tier、alias acceptance、persist / enrich 去向。
- **FR-004**: 必须先收 authoritative replay surface，再收 browser replay surface；不得先做 UI 大重构。
- **FR-005**: `F-025-A` 的 docs sync 只能跟随 replay parity 直接影响面，不能扩大为 broader docs parity。
- **FR-006**: `F-025-A` 必须保留 `F-024` 的 canonical contract baseline 作为 authority，不得反向改写 F-024 已冻结 truth surface。
- **FR-007**: 若工作开始依赖 Windows 专项 replay 行为，必须停止并转入 `F-025-B`，不得继续挤在 `F-025-A` 内。
- **FR-008**: 若工作开始扩张到 callback / 自建应用增强链路、动态表单引擎、persisted schema 全迁移或泛化 cleanup，必须停止并切包。
- **FR-009**: `F-025-A` 允许的唯一清理动作是 blocker-driven 小清理，且必须可单独归因与验证。
- **FR-010**: 本轮不得把真实凭据 E2E、Windows replay fidelity 或 broader docs parity 写成已完成事实。
- **FR-011**: 必须把 `F-025-A` 明确保留为只读 replay parity baseline，不在 `F-025-B` 中重开或改写。
- **FR-012**: 必须为 `F-025-B` 定义一句话定义、相对 `F-025-A` 的新增 truth surface、最小 packet 切分与 fresh verification evidence。
- **FR-013**: `F-025-B` 必须只覆盖 Windows replay fidelity、PowerShell 与 Windows 环境差异，不得扩大到 broader docs parity。
- **FR-014**: `F-025-B` 的 packet 设计必须为每个 packet 明确 owner、目标、write-set、DONE 标准与 BLOCKED 标准。
- **FR-015**: `F-025-B` 必须把 tutorial / SOP / handoff / broader docs parity 明确留给 `F-025-C`。

### Non-Goals

- **NG-001**: 本轮不做 `F-025-C` 的 broader docs parity。
- **NG-002**: 本轮不做 callback / 自建应用增强链路专项收口。
- **NG-003**: 本轮不做全仓 cleanup、路线清理或架构重整。
- **NG-004**: 本轮不引入动态表单引擎，也不做 persisted schema 全迁移。
- **NG-005**: 本轮不把 `F-025-A` 已通过的 replay parity baseline 当作未定事项重新打开。

## Success Criteria

- **SC-001**: `specs/025-channel-replay-doc-parity/` 下存在有效的 `spec.md`、`plan.md`、`tasks.md`，且明确 `F-025-A` 已冻结为 baseline、`F-025-B` 已形成 design-only packet 设计。
- **SC-002**: `F-025-A` 的 packet 顺序、owner / reviewer / verifier 角色边界、stop rule 与 acceptance gate 已被冻结。
- **SC-003**: replay parity 的 truth surface 明确只覆盖 install / dashboard / read-back + 最小 docs parity。
- **SC-004**: 任意 worker 阅读 `F-025-A` 文档后，都不会把 Windows replay fidelity、broader docs parity 或 cleanup 误当成本轮主线。
- **SC-005**: 文档中明确保留 `F-025-B` 与 `F-025-C` 的后续边界，而不是把它们提前并入 `F-025-A`。
- **SC-006**: 文档中明确 `F-025-B` 的一句话定义、Windows truth surface、fresh verification evidence 与 `F-025-C` 留白。
- **SC-007**: Commander 可以直接引用 `F-025-B` 的 packet 切分继续派工，而无需再重做 scope freeze。
