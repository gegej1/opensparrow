# Tasks: Mac UI-first Release Readiness

**Feature ID**: `F-027`  
**Input**: `specs/027-mac-ui-first-release-readiness/spec.md`, `specs/027-mac-ui-first-release-readiness/plan.md`  
**Dispatch rule**: Mac-only、packaged-artifact-first、UI-first 主路径优先。任何完成声明都必须依赖 fresh packaged macOS evidence。禁止把 Windows、companion 全量支持、broader docs parity、callback/self-built app enhancement、或全仓 cleanup 混入本 feature。

## 派工前统一约束

- 先读：`AGENTS.md`、`.specify/memory/constitution.md`、`docs/governance/framework-stack.md`、`docs/项目持久化说明.md`
- `F-027` 是新的 Mac-only feature，不是 `F-025-B` 的 Mac 分支
- `F-025-B` 必须继续保持 `blocked on Windows-specific evidence`
- `F-026` 已 verified closeout，不得重开
- authority 在 packaged artifact 的官方支持面与 release gate，不在 carrier 名词
- 只有 packaged artifact 上的 fresh macOS evidence 才能支撑 freeze / release
- secondary wrappers 可以保留，但只能作为 handoff，不得回到 legacy CLI 主路径
- companion 默认不在今晚正式支持面；若 artifact 真的暴露 companion，必须停下并回 Commander
- 若对外承诺 WeCom，只能沿用真正 `F-014` 的 bot-first long-connection 主链；callback 不是默认 blocking gate
- 若命中 bundled runtime / packaged artifact blocker，必须写成 release blocker，不得写成真正 `F-014` 失败
- **明确 stop rule**：一旦任务开始滑向 Windows、companion 全量支持、broader docs parity、callback/self-built app enhancement、或全仓 cleanup，必须立即停止并回 Commander

---

## Spec Freeze

### T027-SPEC-1 — 冻结 F-027 文档边界
- **Recommended owner**: `Planning Agent`
- **Goal**: 产出可供 review 的 `spec.md / plan.md / tasks.md`，把 `F-027` 的 packaged release-readiness 边界、packet、gate、stop rule 写清楚。
- **Write-set**:
  - `specs/027-mac-ui-first-release-readiness/spec.md`
  - `specs/027-mac-ui-first-release-readiness/plan.md`
  - `specs/027-mac-ui-first-release-readiness/tasks.md`
- **Read-set**:
  - `AGENTS.md`
  - `.specify/memory/constitution.md`
  - `docs/governance/framework-stack.md`
  - `docs/项目持久化说明.md`
  - `longrun/workspaces/opensparrow-unified/feature_list.json`
  - `longrun/workspaces/opensparrow-unified/claude-progress.txt`
  - `specs/003-opensparrow-ui-reset-hardening/spec.md`
  - `specs/026-mac-first-platform-parity/spec.md`
  - `specs/026-mac-first-platform-parity/mac-truth-inventory.md`
  - `specs/014-mac-arm64-installer-hardening/spec.md`
  - `docs/runbooks/F-005-ui-install-reset.md`
- **Checks**:
  - 新 feature 身份、fresh packaged evidence gate、secondary wrapper role guard、WeCom bot-first gate、stop rule 都已写清楚。
- **Done when**:
  - 文档达到 review-ready。

---

## Review Gate

### T027-REV-1 — SpecReviewer 审核 `Ready for PKT-027-A1 dispatch`
- **Recommended owner**: `SpecReviewer`
- **Goal**: 只审 `spec / plan / tasks` 是否已经达到 `Ready for PKT-027-A1 dispatch`。
- **Write-set**:
  - 无
- **Read-set**:
  - `specs/027-mac-ui-first-release-readiness/spec.md`
  - `specs/027-mac-ui-first-release-readiness/plan.md`
  - `specs/027-mac-ui-first-release-readiness/tasks.md`
- **Checks**:
  - `F-027` 是否明确是新的 Mac-only packaged release-readiness feature；
  - 是否明确不推进 Windows，且没有改写 `F-025-B` 的 blocked 状态；
  - 是否把 packaged artifact fresh evidence 定义为 freeze / release gate；
  - 是否把 UI-first 官方支持面、companion exclusion、secondary wrapper handoff、WeCom bot-first 主链写清楚；
  - packet 是否可派工、可验证、可收口。
- **Done when**:
  - Reviewer 输出 `Ready for PKT-027-A1 dispatch`
- **Stop if**:
  - reviewer 试图改文件、做实现、或做 verifier 工作。

---

## PKT-027-A1：packaged mac release surface inventory / blocker attribution

### T027-A1-1 — 冻结 packaged 官方支持面与 blocker attribution
- **Recommended owner**: `Worker-A`
- **Goal**: 只基于 actual packaged Mac candidate artifact 盘清今晚官方支持面、secondary wrapper role、WeCom outward promise、以及 release blocker / decision point。
- **Write-set**:
  - `specs/027-mac-ui-first-release-readiness/packaged-mac-release-surface-inventory.md`
- **Read-set**:
  - `specs/027-mac-ui-first-release-readiness/spec.md`
  - `specs/027-mac-ui-first-release-readiness/plan.md`
  - `specs/027-mac-ui-first-release-readiness/tasks.md`
  - Commander 指定的 packaged Mac candidate artifact
  - packaged `01-开始部署.command`
  - packaged `mac/run-openclaw-usb.command`
  - packaged `mac/harden-openclaw-usb.command`
  - packaged `ui/server.mjs`
  - packaged `ui/public/index.html`
  - packaged `ui/public/dashboard.html`
  - packaged `README.md`
  - packaged `README.txt`
  - packaged `docs/INSTALL.md`
  - packaged `docs/SOP.md`
  - packaged `runbooks/F-005-ui-install-reset.md`
  - packaged `runbooks/release-process.md`
  - packaged `vendor/mac-openclaw/`
  - packaged `plugins/*.tgz`
  - `specs/003-opensparrow-ui-reset-hardening/spec.md`
  - `specs/014-mac-arm64-installer-hardening/spec.md`
  - `specs/026-mac-first-platform-parity/spec.md`
  - `specs/026-mac-first-platform-parity/mac-truth-inventory.md`
- **Steps**:
  1. 确认 packaged root 上唯一官方支持的 Mac first-click path。
  2. 确认 secondary wrappers 是 handoff 还是仍在误当主路径。
  3. 确认 package 内 README / INSTALL / SOP / runbook 是否仍暴露 Windows、legacy path 或矛盾的 channel promise。
  4. 确认 companion 是否根本未 shipped，还是已经变成不可回避入口。
  5. 把所有 gap 归因为 implementation gap、artifact-generation gap、release wording gap、runtime/plugin blocker、或 Commander decision。
- **Checks**:
  - inventory 只谈 packaged surface，不谈 generic source cleanup；
  - inventory 必须把 secondary wrapper role guard 写清楚；
  - inventory 必须把 WeCom 仅按真正 `F-014` bot-first 主链处理；
  - inventory 命中 runtime / artifact blocker 时，必须写成 release blocker。
- **Fresh evidence required**:
  - 对 actual packaged artifact 的 fresh reread 和目录/版本探针；
  - 历史 source / longrun 不得单独支撑 DONE。
- **Done when**:
  - Commander 可以直接据此派发 `A2`；
  - official support surface、secondary wrapper role、WeCom promise 边界、release blocker attribution 全部冻结。
- **Blocked if**:
  - 没有唯一 candidate artifact；
  - packaged surface 冲突到必须 Commander 先裁决支持面。
- **Stop if**:
  - 开始做实现、Windows 分析、companion 全量支持、broader docs parity、callback 增强、或 cleanup。

---

## PKT-027-A2：ui-first release-path implementation closure

### T027-A2-1 — 收口 packaged UI-first 主路径与 direct release wording
- **Recommended owner**: `Worker-A`
- **Goal**: 只收口 `A1` 已归因、且直接阻塞今晚 Mac UI-first 首发的 packaged release-path gap。
- **Write-set**:
  - `platforms/mac/wrappers/01-开始部署.command`
  - `platforms/mac/wrappers/run-openclaw-usb.command`
  - `platforms/mac/wrappers/harden-openclaw-usb.command`
  - `ui/server.mjs`
  - `ui/public/index.html`
  - `ui/public/dashboard.html`
  - `docs/usb-pack/INSTALL.md`（仅当 A1 已归因其属于 direct release wording）
  - `docs/usb-pack/SOP.md`（仅当 A1 已归因其属于 direct release wording）
  - `docs/runbooks/F-005-ui-install-reset.md`（仅当 A1 已归因其属于 direct release wording）
  - `docs/runbooks/release-process.md`（仅当 A1 已归因其属于 direct release gate wording）
  - `docs/release-checklist.md`（仅当 A1 已归因其属于 direct release gate wording）
  - `longrun/workspaces/openclaw-usb-portable/execution/scripts/create-mac-handoff-copy.sh`（仅当 A1 已归因 blocker 落在 artifact generation）
  - `longrun/workspaces/openclaw-usb-portable/execution/scripts/lib/export-common.sh`（仅当 A1 已归因 blocker 落在 artifact generation）
- **Read-set**:
  - `specs/027-mac-ui-first-release-readiness/spec.md`
  - `specs/027-mac-ui-first-release-readiness/packaged-mac-release-surface-inventory.md`
  - packaged candidate artifact
  - 上述对应 source-of-truth 文件
- **Steps**:
  1. 只修 `A1` 已归因的 tonight release-path blocker。
  2. 保持 root `01-开始部署.command` 是 packaged Mac 唯一官方主路径。
  3. 让 shipped secondary wrappers 只做 handoff，不再回到 legacy CLI 主路径。
  4. 把 package 内直接面向用户的 first-click / support-surface wording 收口到今晚 Mac-only UI-first 口径。
  5. 重新生成 candidate artifact，并确认 artifact 真正反映 source truth。
- **Checks**:
  - 不得把 Windows、companion 正式支持、broader docs parity、callback 增强、或 cleanup 混进来；
  - 若保留 WeCom outward promise，只能按真正 `F-014` bot-first 主链处理；
  - 命中 runtime / packaged artifact blocker 时必须停在 release blocker。
- **Fresh evidence required**:
  - targeted syntax / source checks；
  - 新 candidate artifact 的 fresh inspection。
- **Done when**:
  - tonight Mac UI-first release path 已收口到一个可验证 candidate artifact；
  - `A3` 可以只围绕 packaged artifact 做 gate。
- **Blocked if**:
  - 问题需要 full runtime refresh、companion 全量支持、Windows 证据、callback 增强、或 broader docs sweep。
- **Stop if**:
  - 修复开始演变成全仓 cleanup、完整 packaging overhaul、或其它 feature。

---

## PKT-027-A3：packaged mac verification-only release gate

### T027-A3-1 — 用 fresh packaged evidence 做今晚 release gate
- **Recommended owner**: `Batch Verifier`
- **Goal**: 只基于 actual packaged Mac candidate artifact 的 fresh macOS evidence，给 Commander 一个 clear PASS / BLOCKED / DECISION REQUIRED gate。
- **Write-set**:
  - 无默认 repo write-set
- **Read-set**:
  - `specs/027-mac-ui-first-release-readiness/spec.md`
  - `specs/027-mac-ui-first-release-readiness/plan.md`
  - `specs/027-mac-ui-first-release-readiness/tasks.md`
  - `specs/027-mac-ui-first-release-readiness/packaged-mac-release-surface-inventory.md`
  - actual packaged Mac candidate artifact
- **Steps**:
  1. 从 packaged artifact fresh 解包 / 运行 / 访问，不使用 source tree 代替。
  2. 验证 root `01-开始部署.command` 是否进入 UI-first 安装路径。
  3. 验证 secondary wrappers 若仍 shipped，是否只做 handoff，不再直收凭据或直跑 legacy CLI。
  4. 验证 packaged README / INSTALL / SOP / runbook 是否已经与今晚 Mac-only UI-first 支持面一致。
  5. 若 package 仍对外承诺 WeCom，验证是否只沿真正 `F-014` 的 bot-first 主链过 gate。
- **Checks**:
  - 只接受 packaged macOS fresh evidence；
  - source-level smoke 不是本轮 release gate；
  - companion 若在 artifact 中成为实际入口，必须停在 Commander decision；
  - runtime / plugin / artifact blocker 必须写成 release blocker，不得写成真正 `F-014` 失败。
- **Done when**:
  - Commander 拿到 clear PASS / BLOCKED / DECISION REQUIRED 结论。
- **Blocked if**:
  - packaged evidence 不足；
  - support surface 仍冲突；
  - WeCom promise 与 packaged evidence 不匹配。
- **Stop if**:
  - verification 需要补实现、补 Windows 证据、补 companion 支持、或补 callback 增强链路。

---

## PKT-027-A4：facts-only closeout writeback

### T027-A4-1 — 只把 A3 已证实的 packaged facts 写回
- **Recommended owner**: `Closer`
- **Goal**: 只把 A3 已支撑的事实写回长期记忆层，不靠 closeout 自我升级 authority。
- **Write-set**:
  - `longrun/workspaces/opensparrow-unified/feature_list.json`
  - `longrun/workspaces/opensparrow-unified/claude-progress.txt`
- **Read-set**:
  - `specs/027-mac-ui-first-release-readiness/spec.md`
  - `specs/027-mac-ui-first-release-readiness/plan.md`
  - `specs/027-mac-ui-first-release-readiness/tasks.md`
  - A3 verifier evidence
- **Steps**:
  1. 只搬运 A3 已确认的 PASS / BLOCKED / DECISION REQUIRED 事实。
  2. 若结论是 blocker，只写 blocker，不升级为 passing。
  3. 明确保留 `F-025-B = blocked on Windows-specific evidence`。
  4. 明确保留 `F-026` 已 verified closeout、真正 `F-014` 仍按 bot-first 主链成立。
- **Checks**:
  - closeout 不得改写 `F-025-B`、`F-026`、或真正 `F-014` 的身份和事实；
  - closeout 不能补实现、补 docs parity、或补 verification。
- **Done when**:
  - longrun 只反映已验证的 packaged facts。
- **Blocked if**:
  - A3 没有 clear gate。
- **Stop if**:
  - closeout 试图反向改写 spec / code / verification truth。
