# F-027 Packaged Mac UI-first Release Readiness

**Feature ID**: `F-027`  
**Feature Branch**: `027-mac-ui-first-release-readiness`  
**Created**: 2026-04-15  
**Status**: Draft (Scope Freeze for Review)  
**Input**: Commander 已冻结今晚主线只做 `Mac UI-first 首发准备`；不做 Windows，不推进 `F-025-B`，且不得改写 `F-025-B = blocked on Windows-specific evidence`；`F-026` 已完成 verified closeout，不得重开；authority 在 packaged Mac artifact 的官方支持面与 release gate，而不在载体名词本身。

## F-027 一句话定义

`F-027 = 为今晚首发把 packaged Mac artifact 的官方支持面、UI-first 主路径、release blocker 归因和 fresh packaged evidence gate 冻结成一个新的 Mac-only feature；它不是把 Mac 再塞回 F-025-B，也不是做源码层面的泛 Mac 清理。`

## Truth Source / Governance Authority

- authority 顺序仍然是：用户最新指令 → `AGENTS.md` / `.specify/memory/constitution.md` → 本 feature 的 `spec.md / plan.md / tasks.md`。
- `longrun/*` 只作为项目记忆与已冻结事实背景，不作为本 feature 的 truth source。
- `F-027` 的 authority 落点是：
  1. packaged Mac candidate artifact 的实际对外支持面；
  2. packaged artifact 上的 fresh macOS evidence；
  3. Commander 对 release gate / blocker / decision point 的最终裁决。
- `zip / package / bundle / handoff copy` 只是载体称呼；本 feature 不争论名词，只冻结“用户实际拿到的官方 Mac 交付物到底暴露了什么、允许承诺什么、如何过 gate”。

## 为什么单开 F-027

`F-026` 已完成的是 source-level mac-first direct user-path verified closeout。  
今晚首发需要回答的不是“源码里理论上是否已经更优雅”，而是“当前 packaged Mac artifact 对外暴露出来的第一条路径、辅助入口、文案承诺、插件/runtime 约束，是否已经达到 UI-first release readiness”。

当前已观察到的 packaged candidate artifact 说明本 feature 必须单开：

1. 候选包根目录已经提供 `01-开始部署.command`，说明 Mac UI-first primary path 已经存在；
2. 同一候选包仍同时携带 `mac/run-openclaw-usb.command`、`mac/harden-openclaw-usb.command`，secondary wrapper 角色必须在 packaged surface 上重新冻结；
3. 候选包内 `README` / `INSTALL` / `SOP` / `runbooks` 目前仍混有 Windows 路径、legacy `run-openclaw-usb.command` 安装路径、以及不完全一致的 channel 承诺，因此“真正的官方支持面”仍未被 packaged evidence 冻结。

因此 `F-027` 必须是新的 Mac-only release-readiness feature，而不是：

- 回头重开 `F-026`；
- 把 Mac 塞进 `F-025-B`；
- 借今晚首发做 broader docs parity / cleanup / full Mac overhaul。

## 与已冻结 feature 的关系

### 与 `F-026` 的关系

- `F-026` 已 verified closeout，只提供 source-level mac-first direct user-path 的上游冻结事实。
- `F-027` 只消费 `F-026` 的已闭环事实，不重开其 scope，不回写其 closeout 结论。
- 若 packaged artifact 与 `F-026` 的 source-level结论不一致，这属于 `F-027` 的 packaged release-readiness delta 或 release blocker，而不是 `F-026` 失败。

### 与 `F-025-B` 的关系

- `F-025-B` 继续保持 `blocked on Windows-specific evidence`。
- `F-027` 是新的 Mac-only feature，不推进 Windows，不吸收 Windows fidelity，不改写 `F-025-B` 的 blocked 状态。
- 若 packaged candidate 仍显式对外暴露 Windows 支持面，这属于 `F-027` 的 release-surface blocker / Commander decision，而不是 `F-025-B` 开工。

### 与 `F-014 = wecom-channel-integration` 的关系

- 真正的 `F-014` 仍是 `wecom-channel-integration`，且 passing 口径仍然是 bot-first long-connection 主链。
- 若今晚对外承诺 WeCom，`F-027` 只允许沿用真正 `F-014` 已冻结的 `Bot ID + Secret` 主链；callback / 自建应用 enhanced chain 仍不是默认 blocking gate。
- 若 packaged artifact 命中 WeCom runtime / plugin / package blocker，只能写成 `F-027` release blocker，不得反写成真正 `F-014` 失败。

### 与 `specs/014-mac-arm64-installer-hardening/` 的关系

- `specs/014-mac-arm64-installer-hardening/` 是历史 spec 目录，不是当前 authority 中的 `F-014`。
- 它只提供 bundled plugin archive、skill copy、packaged install gating 等上游背景。
- `F-027` 若遇到 bundled runtime / packaged artifact blocker，可以引用其历史上下文，但不能把这个 spec 目录误写成真正的 `F-014` 身份。

### 与 `F-003` 的关系

- `F-003` 已冻结 UI-first、`/api/status`、reset / `?force=1` / `/setup` 的基础契约。
- `F-027` 只消费这些契约在 packaged artifact 上是否被正确暴露与验证，不重写 `F-003` 的状态机。

## 官方支持面（今晚版）

### In Scope official surface

1. **packaged Mac primary launcher**
   - packaged artifact 根目录对用户可见的 `01-开始部署.command`
   - 目标是把它冻结成今晚唯一官方支持的 Mac UI-first 主路径

2. **packaged UI install / dashboard surface**
   - packaged `ui/server.mjs`
   - packaged `ui/public/index.html`
   - packaged `ui/public/dashboard.html`
   - 只检查与 install / dashboard / read-back / reset / gateway binding 直接相关的 packaged behavior

3. **packaged release-surface wording**
   - 只覆盖直接定义“用户第一步怎么点、支持什么平台、支持什么 channel、secondary wrapper 扮演什么角色”的 packaged README / INSTALL / SOP / runbook wording
   - 这不是 broader docs parity，而是 release surface contract 本身

4. **packaged runtime / plugin readiness**
   - packaged `vendor/mac-openclaw/`
   - packaged `plugins/*.tgz`
   - 只检查是否构成今晚 release gate 或 blocker，不顺手扩成 runtime 大改造

5. **packaged secondary wrappers**
   - `mac/run-openclaw-usb.command`
   - `mac/harden-openclaw-usb.command`
   - 允许保留，但必须被冻结为 handoff / advanced compatibility role，不能回到 legacy CLI 主路径

### Explicitly excluded from official support surface

- companion 不是今晚首发的正式支持入口；
- 除非 `A1` 发现 packaged artifact 把 companion 暴露成了用户无法绕开的入口，否则不得主动扩 scope 去支持 companion；
- 一旦命中“artifact 真的暴露 companion”这种情况，只能写成 Commander decision point，不能自行把 companion 全量收进 `F-027`。

## Scope

### In Scope

1. 冻结 packaged Mac artifact 的 release surface inventory 与 blocker attribution。
2. 收口 packaged artifact 上与 UI-first 主路径直接相关的实现 / 打包 / 直接 release-surface wording 闭环。
3. 用 fresh packaged macOS evidence 建立今晚 freeze / release gate。
4. 若今晚对外承诺 WeCom，只按真正 `F-014` 的 bot-first long-connection 主链处理。
5. facts-only closeout writeback，但前提必须是 packaged evidence 已过 gate。

### Out of Scope

- Windows fidelity、`F-025-B`、或任何 Windows-specific evidence。
- `F-026` verified closeout 的重开。
- companion 全量正式支持。
- broader docs parity / 全 docs 大扫除。
- callback / self-built app enhanced chain。
- generic source cleanup / refactor / full Mac overhaul。
- containerization、cross-platform packaging strategy、carrier naming 争论。
- 命中 bundled runtime / packaged artifact blocker 后顺手升级成“全仓 runtime 重整”。

## Packaged Truth Surface

### 1. Candidate artifact root

- Commander 选定的 packaged Mac candidate artifact。
- 当前已观察到的候选形态可来自：
  - `dist/handoff/opensparrow-mac-ui-full-arm64-*/opensparrow-*-mac-ui-arm64/`
  - 其对应 `.zip`
  - 或后续等价的 package / bundle 展开目录

### 2. Primary launcher truth surface

- packaged 根目录 `01-开始部署.command`
- 目标：确认它是否真的是唯一官方支持的 Mac UI-first 起点

### 3. Secondary wrapper truth surface

- packaged `mac/run-openclaw-usb.command`
- packaged `mac/harden-openclaw-usb.command`
- 目标：确认它们是否只做 UI-first / Dashboard handoff，而不是重新把用户带回 legacy CLI 主路径

### 4. Packaged UI service truth surface

- packaged `ui/server.mjs`
- packaged `ui/public/index.html`
- packaged `ui/public/dashboard.html`
- 目标：确认 packaged install / dashboard / read-back / reset / gateway binding 与首发支持面一致

### 5. Packaged release wording truth surface

- packaged `README.md`
- packaged `README.txt`
- packaged `docs/INSTALL.md`
- packaged `docs/SOP.md`
- packaged `runbooks/F-005-ui-install-reset.md`
- packaged `runbooks/release-process.md`
- 目标：只冻结会直接影响用户第一步和首发承诺的 wording，不扩成 broader docs parity

### 6. Packaged runtime / plugin truth surface

- packaged `vendor/mac-openclaw/`
- packaged `plugins/openclaw-china-channels-*.tgz`
- packaged `plugins/sunnoy-wecom-*.tgz`
- 目标：只判断是否满足今晚 release gate；若不满足，写成 release blocker

## 推荐最小 packet 切分

1. **`PKT-027-A1 = packaged mac release surface inventory / blocker attribution`**
   - 只看 packaged candidate artifact，冻结官方支持面、secondary wrapper role、WeCom promise 边界、以及 blocker attribution。

2. **`PKT-027-A2 = ui-first release-path implementation closure`**
   - 只收口 `A1` 已归因的 packaged UI-first 主路径、secondary wrapper handoff、direct release wording、artifact-generation closure。

3. **`PKT-027-A3 = packaged mac verification-only release gate`**
   - 只接受 fresh packaged macOS evidence；只有 packaged evidence 才能支撑 freeze / release。

4. **`PKT-027-A4 = facts-only closeout writeback`**
   - 只搬运 A3 已证实的事实；不得靠 closeout 反向升级 feature 状态。

## Requirements

### Functional Requirements

- **FR-001**: 必须把 `F-027` 明确定义成新的 Mac-only feature，而不是把 Mac 再塞回 `F-025-B`。
- **FR-002**: 必须把目标定义成 `packaged Mac artifact` 的 `UI-first release readiness`，而不是源码层面的泛 Mac 清理。
- **FR-003**: `zip / package / bundle / handoff copy` 只作为 carrier；authority 必须落在官方支持面与 release gate，而不在载体名词本身。
- **FR-004**: 只有 packaged artifact 上的 fresh macOS evidence 才能支撑 freeze / release；source reread、旧 longrun、旧 source-level evidence 只能做背景。
- **FR-005**: packaged secondary wrappers 可以保留，但只能被定义为 handoff / advanced compatibility surface，不得重新成为 legacy CLI 主路径。
- **FR-006**: companion 不得被默认纳入今晚正式支持面；若 packaged artifact 把 companion 暴露成不可回避入口，只能形成 Commander decision point。
- **FR-007**: 若对外承诺 WeCom，`F-027` 只能沿用真正 `F-014` 已冻结的 bot-first long-connection 主链；callback 仍不是默认 blocking gate。
- **FR-008**: 若命中 bundled runtime / packaged artifact blocker，必须明确写成 `F-027` release blocker，不得回写成真正 `F-014` 失败。
- **FR-009**: `F-026` 已完成 verified closeout，不得被 `F-027` 重新打开；packaged divergence 只能算 `F-027` delta / blocker。
- **FR-010**: `F-025-B` 必须继续保持 `blocked on Windows-specific evidence`，任何 Windows 内容都不能并入本 feature。
- **FR-011**: 直接定义 packaged 第一点击路径的 README / INSTALL / SOP / runbook wording 属于本 feature 的 release-surface truth；但 broader docs parity 继续 out-of-scope。
- **FR-012**: `A4` closeout 只能做 facts-only writeback；若 A3 没有 packaged evidence PASS，不得写 passing / release-ready 结论。

### Non-Goals

- **NG-001**: 不推进 Windows，不碰 `F-025-B` 的 blocked 状态。
- **NG-002**: 不做 companion 全量正式支持。
- **NG-003**: 不做 callback / self-built app enhanced chain。
- **NG-004**: 不做 broader docs parity / 全仓文档清扫。
- **NG-005**: 不做 generic source cleanup / full Mac overhaul / architecture refactor。
- **NG-006**: 不把 bundled runtime 或 packaging 问题偷改写成真正 `F-014` 失败。

## Success Criteria

- **SC-001**: Commander 阅读 `spec / plan / tasks` 后，可以直接派发 `PKT-027-A1`，无需再补 scope freeze。
- **SC-002**: 阅读文档的人不会把 `F-027` 误读成 `F-025-B`、`F-026` reopen、generic Mac cleanup，或 companion 正式支持战役。
- **SC-003**: 文档明确规定 packaged artifact fresh evidence 才是 release gate，source-level evidence 不是今晚 freeze / release 的充分条件。
- **SC-004**: 文档明确规定 secondary wrappers 只能是 handoff，companion 默认不进入正式支持面。
- **SC-005**: 文档明确规定 WeCom 只按真正 `F-014` 的 bot-first 主链处理，callback 不成为默认 blocking gate。
- **SC-006**: 文档明确规定 bundled runtime / packaged artifact blocker 只能写成 release blocker，不误写成 `F-014` 失败或 `F-026` reopen。
- **SC-007**: 文档把 spec / review / implementation / verification / closeout 分层清楚，且 stop rule 足够硬，不会把 Windows、broader docs parity、callback 增强链路或全仓 cleanup 偷带进来。

## Commander Decision Points

以下事项允许进入 Commander 最终裁决，但不得由 worker 自行扩 scope：

1. **candidate artifact selection**
   - 若同时存在多个 Mac candidate artifact / zip / bundle，必须由 Commander 指定今晚唯一 release candidate。

2. **companion exposure**
   - 若 `A1` 发现 packaged artifact 实际把 companion 暴露成用户入口，必须先做 Commander decision，不能自动转成 companion 支持战役。

3. **WeCom outward promise**
   - 若 packaged README / INSTALL / release notes 对外承诺 WeCom，但 A3 无法用 bot-first 主链过 gate，Commander 必须决定是 de-scope WeCom 还是 hold release。

4. **packaged runtime / artifact blocker**
   - 若 blocker 本质落在 bundled runtime、plugin archive、artifact generation 或 carrier structure，Commander 必须决定是 hold release、切补包、还是缩小今晚支持面。
