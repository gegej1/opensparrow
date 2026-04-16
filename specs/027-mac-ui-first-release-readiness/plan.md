# Commander Plan: Mac UI-first Release Readiness

**Feature ID**: `F-027`  
**Feature Branch**: `027-mac-ui-first-release-readiness`  
**Date**: 2026-04-15  
**Spec**: `specs/027-mac-ui-first-release-readiness/spec.md`

## 战役摘要

`F-027` 不是把 Mac 再塞回 `F-025-B`，也不是回头重开 `F-026`。  
它是今晚独立的新 feature，只回答一个问题：

> 当前 packaged Mac artifact 的官方支持面，是否已经冻结成明确的 UI-first 主路径、受控 secondary wrapper handoff、清楚的 channel 承诺边界、以及可由 fresh packaged evidence 支撑的 release gate？

当前 packaged candidate 已暴露出三个需要被正式纳入计划的风险源：

1. 根目录 primary launcher 已是 `01-开始部署.command`，但 package 内仍同时携带 secondary wrappers；
2. package 内 release-surface wording 仍混有 legacy `mac/run-openclaw-usb.command`、Windows 路径、以及不完全一致的 channel 承诺；
3. 今晚只做 Mac UI-first 首发，因此所有“仍暴露出去的非 Mac / 非 UI-first / 非 bot-first 承诺”都必须被归因为 release blocker 或 Commander decision。

## Packet 顺序与依赖

- `spec / plan / tasks` 在本轮先完成 scope freeze；
- `SpecReviewer` 必须先过 review gate，才允许开 `PKT-027-A1`；
- `PKT-027-A1` 先冻结 packaged release surface 与 blocker attribution；
- `PKT-027-A2` 只能处理 `A1` 已归因且直接服务今晚 Mac UI-first release path 的 closure；
- `PKT-027-A3` 只能基于 actual packaged candidate artifact 做 verification-only release gate；
- `PKT-027-A4` 只能在 `A3` 给出 clear PASS / BLOCKED / DECISION REQUIRED gate 后做 facts-only closeout writeback；
- 一旦任一 packet 开始滑向 Windows、companion 全量支持、broader docs parity、callback/self-built app enhancement、或全仓 cleanup，必须立即停止并回 Commander。

---

## Review Gate

### SPEC-027-R1：Ready-for-dispatch review

- **Goal**: 只审 `spec.md / plan.md / tasks.md` 是否已经达到 `Ready for PKT-027-A1 dispatch`。
- **Owner**: `SpecReviewer`
- **Write-set**: 无
- **Read-set**:
  - `specs/027-mac-ui-first-release-readiness/spec.md`
  - `specs/027-mac-ui-first-release-readiness/plan.md`
  - `specs/027-mac-ui-first-release-readiness/tasks.md`
- **Required checks**:
  - `F-027` 是否被明确写成新的 Mac-only packaged release-readiness feature；
  - 是否明确不推进 Windows 且不改写 `F-025-B` blocked 状态；
  - 是否把 fresh packaged evidence 定义为 freeze / release gate；
  - 是否把 UI-first 官方支持面、secondary wrapper handoff、companion exclusion、WeCom bot-first 主链写清楚；
  - 是否把 stop rule 写硬。
- **Pass condition**:
  - Reviewer 明确给出：`Ready for PKT-027-A1 dispatch`
- **Stop rule**:
  - reviewer 不做实现、不做 verification、不改文件。

---

## PKT-027-A1：packaged mac release surface inventory / blocker attribution

- **Goal**: 只基于 actual packaged Mac candidate artifact 盘清“今晚官方支持面到底是什么、包里还暴露了什么、哪些是 release blocker / decision point”。
- **Scope**:
  - 只看 Commander 指定的 packaged Mac candidate artifact；
  - 只盘点 primary launcher、secondary wrappers、packaged UI surface、packaged release wording、packaged runtime / plugin readiness；
  - 只归因 blocker / decision point，不做实现修复。
- **Non-goals**:
  - 不做 source-level generic Mac cleanup；
  - 不开 Windows 验证；
  - 不把 companion 自动纳入正式支持面；
  - 不做 broader docs parity；
  - 不把 callback / self-built app chain 写成默认 blocking gate。
- **Owner**: `Worker-A`
- **Reviewer**: `SpecReviewer`
- **Verifier**: `Batch Verifier`
- **Closer**: `Commander`
- **Write-set**:
  - `specs/027-mac-ui-first-release-readiness/packaged-mac-release-surface-inventory.md`
- **Read-set**:
  - `specs/027-mac-ui-first-release-readiness/spec.md`
  - `specs/027-mac-ui-first-release-readiness/plan.md`
  - `specs/027-mac-ui-first-release-readiness/tasks.md`
  - Commander 指定的 packaged candidate artifact root（例如 `dist/handoff/opensparrow-mac-ui-full-arm64-*/opensparrow-*-mac-ui-arm64/` 或其等价展开目录）
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
- **Required checks**:
  - 必须冻结 packaged primary launcher 是否为唯一官方支持的 Mac UI-first 起点；
  - 必须冻结 packaged secondary wrappers 是否只做 handoff；
  - 必须冻结 packaged wording 是否仍对外暴露 Windows 或 legacy CLI path；
  - 必须冻结 package 是否对外承诺 WeCom，以及该承诺是否只能沿用真正 `F-014` 的 bot-first 主链；
  - 必须判断 companion 是否实际上根本没有暴露、还是需要 Commander decision；
  - 必须把 runtime / plugin / artifact-generation 问题归因为 `release blocker`，而不是 `F-014` 失败。
- **Fresh evidence required**:
  - 对 actual packaged artifact 的 fresh reread；
  - packaged artifact 解包 / 目录探针；
  - 只读 runtime / plugin version probe；
  - 历史 source / longrun 只能做背景。
- **Done standard**:
  - Commander 获得可派工的 packaged release surface inventory；
  - 已明确一条官方 Mac UI-first 主路径；
  - 已明确 secondary wrapper role guard；
  - 已明确 WeCom outward promise 是 PASS 前置、de-scope 选项、还是 release blocker；
  - `A2` 的实现边界被冻结。
- **Blocked standard**:
  - Commander 尚未指定唯一 candidate artifact；
  - packaged surface 本身存在冲突，需要 Commander 先决定支持面；
  - blocker 本质落在新 feature / runtime refresh / carrier strategy 决策。
- **Stop rule**:
  - `A1` 不改 source / docs / artifact；
  - 一旦盘点开始滑向实现、broader docs parity、Windows、companion 全量支持或 callback 增强，立即停包。

## PKT-027-A2：ui-first release-path implementation closure

- **Goal**: 只收口 `A1` 已归因、且直接阻塞今晚 Mac UI-first 首发的 packaged release-path gap。
- **Scope**:
  - 只处理 `A1` 已确认属于 tonight release surface 的 gap；
  - 允许修改 primary launcher、secondary wrapper handoff、packaged UI surface、以及直接定义首发支持面的 release wording；
  - 允许在必要时修改 artifact generation surface，以确保 packaged candidate 真正反映 source truth；
  - 只收口 Mac UI-first release path，不做 broader cleanup。
- **Non-goals**:
  - 不推进 Windows；
  - 不把 companion 扩成正式支持入口；
  - 不做 callback / self-built app enhancement；
  - 不做 broader docs parity；
  - 不做 full runtime overhaul / package strategy 重写。
- **Owner**: `Worker-A`
- **Reviewer**: `SpecReviewer`
- **Verifier**: `Batch Verifier`
- **Closer**: `Commander`
- **Write-set**:
  - `platforms/mac/wrappers/01-开始部署.command`
  - `platforms/mac/wrappers/run-openclaw-usb.command`
  - `platforms/mac/wrappers/harden-openclaw-usb.command`
  - `ui/server.mjs`
  - `ui/public/index.html`
  - `ui/public/dashboard.html`
  - `docs/usb-pack/INSTALL.md`（仅当 A1 证明其直接定义 packaged 官方支持面）
  - `docs/usb-pack/SOP.md`（仅当 A1 证明其直接定义 packaged 官方支持面）
  - `docs/runbooks/F-005-ui-install-reset.md`（仅当 A1 证明其直接定义 packaged 官方支持面）
  - `docs/runbooks/release-process.md`（仅当 A1 证明其直接定义 packaged release gate）
  - `docs/release-checklist.md`（仅当 A1 证明其直接定义 packaged release gate）
  - `longrun/workspaces/openclaw-usb-portable/execution/scripts/create-mac-handoff-copy.sh`（仅当 A1 证明 blocker 落在 artifact generation）
  - `longrun/workspaces/openclaw-usb-portable/execution/scripts/lib/export-common.sh`（仅当 A1 证明 blocker 落在 artifact generation）
- **Read-set**:
  - `specs/027-mac-ui-first-release-readiness/spec.md`
  - `specs/027-mac-ui-first-release-readiness/packaged-mac-release-surface-inventory.md`
  - `platforms/mac/wrappers/01-开始部署.command`
  - `platforms/mac/wrappers/run-openclaw-usb.command`
  - `platforms/mac/wrappers/harden-openclaw-usb.command`
  - `ui/server.mjs`
  - `ui/public/index.html`
  - `ui/public/dashboard.html`
  - packaged candidate artifact root
  - `docs/usb-pack/INSTALL.md`
  - `docs/usb-pack/SOP.md`
  - `docs/runbooks/F-005-ui-install-reset.md`
  - `docs/runbooks/release-process.md`
  - `docs/release-checklist.md`
  - `specs/003-opensparrow-ui-reset-hardening/spec.md`
  - `specs/014-mac-arm64-installer-hardening/spec.md`
  - `specs/026-mac-first-platform-parity/spec.md`
- **Required checks**:
  - primary launcher 仍是 packaged Mac 唯一官方主路径；
  - secondary wrappers 若继续 shipped，只能 handoff，不得回到 legacy CLI 主路径；
  - package 内直接面向用户的 INSTALL / SOP / runbook wording 不得再把 Windows 或 legacy path 当今晚主线；
  - 若对外保留 WeCom 承诺，只能沿用真正 `F-014` 的 bot-first 主链；
  - 命中 bundled runtime / packaged artifact blocker 时，必须停在 `release blocker`，不能硬把问题写成 `F-014` 失败。
- **Fresh evidence required**:
  - source change 对应的 targeted checks；
  - 新生成 packaged candidate artifact 的 fresh inspection；
  - 任何 release-surface wording 变更都必须在 candidate artifact 内可见。
- **Done standard**:
  - `A1` 已归因的 tonight Mac UI-first release path blocker 已收口或被明确 downgrade / de-scope；
  - Commander 获得新的 candidate artifact；
  - `A3` 可以只针对 packaged artifact 进行 verification。
- **Blocked standard**:
  - 问题需要 full runtime refresh、companion 正式支持、Windows evidence、callback enhancement、或 broader docs sweep；
  - candidate artifact 需要重新定义 carrier / distribution strategy。
- **Stop rule**:
  - 一旦修复开始演变成 full Mac cleanup、full packaging overhaul、Windows parity 或 callback 增强链路，立即停包并回 Commander。

## PKT-027-A3：packaged mac verification-only release gate

- **Goal**: 只基于 actual packaged Mac candidate artifact 的 fresh macOS evidence，判断今晚是否达到 release-ready。
- **Scope**:
  - 只验证 packaged candidate artifact；
  - 只看 primary launcher、secondary wrapper role、packaged UI surface、packaged wording、runtime/plugin readiness；
  - 只验证 WeCom 的 bot-first 主链（若对外承诺仍保留）。
- **Non-goals**:
  - 不新增实现；
  - 不做 Windows；
  - 不做 broader docs parity；
  - 不补 companion 正式支持；
  - 不补 callback / self-built app chain。
- **Owner**: `Batch Verifier`
- **Reviewer**: `SpecReviewer`
- **Verifier**: `Batch Verifier`
- **Closer**: `Commander`
- **Write-set**:
  - 无默认 repo write-set
- **Read-set**:
  - `specs/027-mac-ui-first-release-readiness/spec.md`
  - `specs/027-mac-ui-first-release-readiness/plan.md`
  - `specs/027-mac-ui-first-release-readiness/tasks.md`
  - `specs/027-mac-ui-first-release-readiness/packaged-mac-release-surface-inventory.md`
  - actual packaged candidate artifact root
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
  - packaged `vendor/mac-openclaw/`
  - packaged `plugins/*.tgz`
- **Required checks**:
  - 只接受从 actual packaged candidate artifact 重新执行得到的 fresh macOS evidence；
  - primary launcher 必须把用户带到 UI-first install path；
  - secondary wrappers 若仍 shipped，必须是 handoff，不得出现 legacy CLI 凭据问答；
  - packaged wording 不得继续把 Windows、legacy path、或不成立的 channel promise 当今晚官方支持面；
  - 若保留 WeCom outward promise，只验证真正 `F-014` 的 bot-first 主链，callback 不作默认 blocking gate；
  - 若命中 runtime / plugin / packaged artifact blocker，结论必须是 `release blocker`，而不是 `F-014` fail。
- **Fresh evidence required**:
  - macOS 主机上的 artifact 解压 / 启动 / 浏览器落点 / `/api/status` / targeted install-dashboard-readback / wrapper behavior evidence；
  - 与 candidate artifact 一一对应的日志、截图、命令输出；
  - source-level smoke 不算本轮 release gate 证据。
- **Done standard**:
  - Commander 获得 clear PASS / BLOCKED / DECISION REQUIRED gate；
  - 结论只基于 packaged artifact；
  - 不会误宣称 `F-025-B` 已推进，也不会误宣称 `F-026` 被重开。
- **Blocked standard**:
  - packaged evidence 不足；
  - candidate artifact 仍存在冲突支持面；
  - WeCom outward promise 与 packaged evidence 不匹配。
- **Stop rule**:
  - verification 不补实现；
  - 一旦需要新实现、新 feature、Windows evidence 或 callback 增强，立即停在 blocker / decision。

## PKT-027-A4：facts-only closeout writeback

- **Goal**: 只把 A3 已证实的 packaged facts 写回长期记忆层，不制造新 authority。
- **Scope**:
  - 只同步已被 A3 支撑的 PASS / BLOCKED / DECISION 事实；
  - 只更新长期记忆与必要的 closeout 记录；
  - 不补实现，不补 broader docs。
- **Non-goals**:
  - 不靠 closeout 自我升级 feature 状态；
  - 不借 closeout 重写 `F-025-B` blocked 状态；
  - 不借 closeout 重开 `F-026` 或真正 `F-014`。
- **Owner**: `Closer`
- **Reviewer**: `Commander`
- **Verifier**: `Batch Verifier`
- **Closer**: `Commander`
- **Write-set**:
  - `longrun/workspaces/opensparrow-unified/feature_list.json`
  - `longrun/workspaces/opensparrow-unified/claude-progress.txt`
- **Read-set**:
  - `specs/027-mac-ui-first-release-readiness/spec.md`
  - `specs/027-mac-ui-first-release-readiness/plan.md`
  - `specs/027-mac-ui-first-release-readiness/tasks.md`
  - A3 verifier output
- **Required checks**:
  - 只搬运 packaged evidence 已支撑的事实；
  - 若 A3 是 BLOCKED / DECISION REQUIRED，只能照实写 blocker / decision，不得写成 passing；
  - `F-025-B = blocked on Windows-specific evidence` 必须原样保持；
  - `F-026` 已 verified closeout 的事实必须保持闭合。
- **Done standard**:
  - longrun 只反映已验证 packaged facts；
  - Commander 可以据此宣布 release-ready、hold、或 de-scope 结论。
- **Blocked standard**:
  - A3 没有 clear gate；
  - closeout 需要补证据或补实现。
- **Stop rule**:
  - 一旦 closeout 试图反向改 spec / code / verification truth，立即停止。

## Commander Final Decisions

`F-027` 结束前，Commander 至少需要对以下事项做最终裁决：

1. 今晚唯一 release candidate artifact 是哪个；
2. packaged artifact 内是否允许继续暴露 secondary wrappers，以及暴露方式是否足够清楚地只是 handoff；
3. packaged wording 是否需要移除 Windows / legacy / channel over-promise；
4. WeCom 今晚是保留在 support surface、降级为非承诺项、还是因为 packaged blocker 暂停发版；
5. 若命中 runtime / packaged artifact blocker，是补包、延后、还是缩小支持面。
