# Feature Specification: Packaged Plugin Install Hang and Bypass

**Feature ID**: `F-033`  
**Feature Branch**: `033-packaged-plugin-install-hang-and-bypass`  
**Created**: `2026-04-23`  
**Status**: `Draft (fresh live install blocker freeze)`  
**Input**: Commander 已冻结 fresh live truth：当前真实 artifact `/private/tmp/f032-packaged-rebuild-botvDw/gtclaw-mac-release-arm64-20260423-141103/GTClaw-0.1.0-alpha-macOS-arm64` 在 real `/api/install` 中停在 `status:"running" / currentStep:"plugins" / summary:"正在安装渠道插件与内置能力"`；连续 30 秒观测到 `extensions/channels/node_modules` 文件数与目录体积不变，`openclaw` / `openclaw-plugins` CPU 维持 `0.0%`，`install.log` 无新增。当前 blocker 已确认是 packaged real install 卡在 plugin install 子进程，而不是旧 timeout / UI fake hang。

## 一句话定义

`F-033 = 只为 packaged install 的 plugin-install hang 与 safe-bypass 判定补齐 truthful backend/runtime contract 的 follow-up packet；它先回答“selected channels = dingtalk + wecom 这条真实路径是否存在安全短路”，若答案是否定，则目标转为 bounded fail-fast 或 root-cause fix，但始终不允许把未 authoritative ready 的 requested channels 写成安装成功。`

## Follow-up Freeze

- 本 packet 只处理当前 fresh live blocker：
  - packaged real install 卡在 `step = plugins`；
  - 当前 selected channels 为：
    - `dingtalk`
    - `wecom`
- 本 packet 必须同时覆盖两种可能闭环：
  - `safe bypass / short-circuit`
  - `no-bypass root-cause fix`
- 本 packet 默认是 backend/runtime packet，不是 install UI packet。
- 本 packet 不 rewrite true `F-014`、true `F-027`、`F-031`、或 `F-032` identity；它只消费既有边界与 invariants。
- internal invariant 必须保持：
  - provider id = `opensparrow-router`
  - target = `opensparrow-router/auto`
- 默认 write-set 只允许：
  - `ui/server.mjs`
  - backend/runtime tests
- `ui/public/*` 默认不在本 packet 写面内；只有在证明“现有 install UI 无法消费 truthful terminal contract”时，才允许回 Commander 申请最小 UI adapter packet。
- 本 packet 不得顺手扩到 Windows、`F-025-B`、channel contract、vendor、packaging strategy、或 native routing。

## Authority / Truth Source

本 feature 的 authority 顺序固定为：

1. 用户本轮 fresh live truth 与禁改约束。
2. `AGENTS.md` 与 `.specify/memory/constitution.md`。
3. 本 feature 的 `spec.md / plan.md / tasks.md`。
4. packaged truth worktree 中与当前 blocker 直接相关的 frozen docs：
   - `docs/current-status.md`
   - `docs/packaged-mac-diagnostics.md`
   - `docs/runtime-flow.md`
5. packaged truth worktree 中当前存在的 install/runtime contract：
   - `ui/server.mjs`
6. 本 packet 会直接继承或扩展的 install/runtime tests：
   - `ui/tests/packaged-dingtalk-install-gate.test.mjs`
   - `ui/tests/packaged-wecom-install-gate.test.mjs`
   - `ui/tests/packaged-install-retry-guards.test.mjs`
   - `ui/tests/packaged-channel-probe-diagnostics.test.mjs`

边界说明：

- `docs/current-status.md`、`docs/packaged-mac-diagnostics.md`、`docs/runtime-flow.md` 中 `2026-04-23` combined packaged PASS 结论是 historical truth，不覆盖用户这轮更新的 fresh live hang truth。
- `specs/031-*` 与 `specs/032-*` 只作为 Packet B / runtime truthful-contract 边界参考，不是本 packet 的主 authority。
- 若 frozen docs 与当前 `ui/server.mjs` install contract 冲突，以用户 fresh live truth + 当前 install/runtime contract 为准。

## Current Fresh Live Truth

当前用户手测的真实 artifact：

- `/private/tmp/f032-packaged-rebuild-botvDw/gtclaw-mac-release-arm64-20260423-141103/GTClaw-0.1.0-alpha-macOS-arm64`

已确认事实：

- live install 不是前端假卡住；
- `/api/install/status` 返回：
  - `status: "running"`
  - `currentStep: "plugins"`
  - `summary: "正在安装渠道插件与内置能力"`
- `install.log` 最后一条停在：
  - `正在安装渠道插件与内置能力`
- 当前请求渠道为：
  - `dingtalk`
  - `wecom`
- 包内 bundled archives 存在：
  - `plugins/openclaw-china-channels-2026.3.29.tgz`
  - `plugins/wecom-wecom-openclaw-plugin-2026.4.22.tgz`
- live 子进程链：
  - `node`
  - `openclaw`
  - `openclaw-plugins`
- 连续 30 秒观测到：
  - `extensions/channels/node_modules` 文件数固定
  - 目录体积固定
  - `openclaw` / `openclaw-plugins` CPU 持续 `0.0%`
  - `install.log` 无新增

当前只能视为 non-authoritative evidence 的迹象：

- bundled tgz presence；
- 目录已展开或文件数/体积稳定；
- `openclaw` / `openclaw-plugins` CPU 很低；
- `install.log` 长时间无新增。

结论：

- 当前 blocker 是 packaged real install 在 plugin-install 子进程上停滞；
- 不是旧的 request timeout 问题；
- 不是 install UI fake hang。
- 对当前 `dingtalk + wecom` live path，**暂无已证明的 safe bypass**；任何 bypass 结论都必须后续由 requested plugin 针对当前 profile 的 authoritative ready proof 单独建立。

## Core Question

本 packet 必须先回答一个核心问题：

> 对当前 `selected channels = dingtalk + wecom` 的 packaged real install 而言，plugin-install 卡点是否存在安全跳过 / 短路 / 降级路径？

当前 freeze 起点固定为：**暂无已证明的 safe bypass**。

这个问题的回答必须是 **authoritative**，不能基于 bundled tgz presence、目录看起来已经展开了、CPU 似乎不动了、或日志不再新增这类弱迹象直接宣布可跳过。只有 requested plugin 对当前 profile 的 authoritative ready proof，才可能让 safe bypass predicate 成立。

## Bypass Decision Surface

### 可跳过 / best-effort 的内容

以下内容允许被定义为 best-effort 或从 critical path 脱钩，但前提是不会影响 requested channel readiness truth：

1. bundled superpowers / skill copy 这类“内置能力”安装；
2. 非 requested channel 的 plugin 安装；
3. 已经 authoritatively 等价于“插件安装完成”的重复安装动作本身。

### 绝不能跳过的内容

以下内容对当前 `dingtalk + wecom` 真实路径属于 non-skippable：

1. requested plugin 的 authoritative readiness proof：
   - `dingtalk` 依赖 `channels`
   - `wecom` 依赖 `wecom-openclaw-plugin`
2. requested channel 的配置写入 gate；
3. requested channel 的 authoritative ready proof，至少要能证明“不是仅仅目录存在，而是当前 profile 真的可加载 / 可继续配置 / 可进入 probe”；
4. truthful terminal verdict：
   - 不允许 indefinite hang
   - 不允许未 ready 却报 success

### Requested-channel success gate

对本 packet，安装只允许在以下条件同时成立时报成功：

1. requested plugins 已被 authoritatively 证明 ready，或被 authoritatively 证明“已安装且与成功安装等价，无需再次等待”；
2. requested channel config 已真正落下；
3. requested channels 在最终 probe / readback 中没有被表述成 `ready:true` 的假阳性。

若以上任一不成立：

- install MUST NOT 报成功；
- install MUST 给出 truthful terminal contract。

## Required Contract Target

### 1. `step=plugins` 不得再无限悬挂

plugin install phase 必须拥有 **bounded** verdict：

- 要么在预算内完成；
- 要么在预算内被 authoritatively short-circuit；
- 要么在预算内 fail-fast；
- 要么根因修复后自然完成。

但无论哪种，都不允许 install 长时间停在：

- `status:"running"`
- `currentStep:"plugins"`

且日志、文件、子进程都无实质进展。

### 2. 必须区分 bypassable 与 non-bypassable stall

本 packet 允许 implementation 在 plugin phase 建立如下决策：

1. **safe_bypass**
   - 仅当 requested plugin 已具备针对当前 profile 的 authoritative equivalence proof / ready proof
   - bypass 的只是“继续等待 install child 完成”这一动作
   - 不是跳过 requested channel readiness gate
2. **blocked_degraded**
   - 当前 install 可证明某些非关键项可跳过，且核心 runtime 可能可继续使用
   - 但 requested channel readiness 尚未成立
   - terminal verdict 只能是 non-success
   - MUST NOT 报 install success
3. **failed**
   - 无 safe bypass
   - 或 requested plugin / stage 根本未闭合
   - terminal verdict 只能是 non-success
   - 需在预算内失败并给出精确原因

### 3. truthful install contract 必须保留现有 UI 可消费性

当前 install UI 只原生识别 terminal：

- `completed`
- `error`
- `done`

因此本 packet 默认要求 backend/runtime contract 尽量复用现有 terminal lane：

- 真正成功：`status = completed`
- 无法对 requested channels truthful 宣称成功：`status = error`

同时必须明确与当前 install UI 的 timeout-like success fallback 断开：

- `blocked_degraded` / `failed` 的 outward terminal lane 必须保持 non-success；
- requested channel 未 ready 时，terminal verdict 只能是 `blocked_degraded` 或 `failed`，不能是 `completed`；
- `blocked_degraded` / `failed` 的 outward response shape 不能只呈现“timeout / timed out / health check”这类会被当前 `index.html` 送入 `waitUntilInstalled()` 或 success redirect 的文本；
- backend 必须返回精确 plugin / stage / readiness reason，使当前 consumer 把它当作真实 non-success，而不是 timeout-like fallback。

同时允许 response / install-status 增加 structured fields，例如：

- `installState = completed | blocked_degraded | failed`
- `blockingStep`
- `blockingPlugin`
- `requestedChannels`
- `requestedChannelReadiness`
- `bypass`
- `nextAction`

是否采用这组字段名由 implementation 决定，但 tests 必须冻结最终 outward contract。

### 4. `blocked_degraded` 不能伪装成 requested-channel success

如果 install 只达到了“core runtime 可能可用”或“某些 best-effort 项已跳过”，但 requested `dingtalk` / `wecom` 尚未 authoritative ready：

- response MUST NOT 为 success；
- outward terminal lane MUST NOT 为 `completed`；
- outward contract MUST NOT 落入当前 install UI 的 timeout-like success fallback / redirect lane；
- `channelProbes.*.ready` MUST NOT 被伪造为 `true`；
- caller MUST 能读到：
  - 哪个 plugin 卡住；
  - 哪个 substage 卡住；
  - 是否存在 safe bypass；
  - 为什么当前 bypass 不成立。

### 5. 若 bypass 不成立，目标必须转为 bounded fail-fast 或真正修 hang

如果 authoritative bypass predicate 不成立，则本 packet 的目标自动转为：

1. bounded fail-fast，或
2. root-cause fix

但无论选哪条，都必须满足：

- 不再无限 running；
- 不再只给笼统“安装失败”；
- 要精确定位 plugin / stage / root-cause lane。

## User Stories

### User Story 1 — 先判断是否能安全短路（P0）

作为 commander，我需要先知道当前 `dingtalk + wecom` 真实 install 路径是否可以安全 bypass，而不是盲目把 hang 全都当 bug 修。

**Independent Test**: source tests 与 fresh packaged verifier 都能证明 bypass predicate 的条件与边界是固定的，且不会把弱迹象误当成 safe bypass。

### User Story 2 — requested channels 未 ready 时绝不报成功（P0）

作为用户，我不能接受 selected channels 实际不可用却被安装向导假装成功。

**Independent Test**: 当 requested `dingtalk` / `wecom` plugin 未 authoritative ready 时，install 一律不能回 `completed` success。

### User Story 3 — no-bypass 场景下受控失败（P0）

作为 packaged verifier，我需要在 bypass 不成立时快速看到受控失败，而不是继续看 `step=plugins` 无限 running。

**Independent Test**: fresh packaged artifact 中，no-bypass 场景会在受控预算内终止，并回读精确的 plugin / stage / root-cause 指示。

## In Scope

1. 收口 packaged `/api/install` / `/api/install/status` 在 `step=plugins` 的 hang verdict。
2. 定义 `safe bypass / blocked_degraded / failed` 的 truthful install contract。
3. 定义 requested-channel success gate：未 authoritative ready 时不得报成功。
4. 明确哪些 install 子项可 best-effort，哪些绝不可跳过。
5. 为 `dingtalk + wecom` 这条真实路径补齐 source-level backend/runtime tests。
6. 为最终 fresh packaged artifact verification 写清楚 evidence 要求。

## Out of Scope

1. `ui/public/index.html` 的默认改动。
2. dashboard / Packet A / Packet B 的任何 reopen。
3. `/api/status` truthful contract 的重开（由 `F-032` 定义）。
4. Windows、`F-025-B`、或任何 Windows-specific evidence。
5. true `F-014` 的 bot-first / callback / WeCom identity。
6. true `F-027` / `F-031` / `F-032` identity rewrite。
7. `ui/lib/model-routing-config.mjs` 或 `scripts/model-routing/lib/custom-plugin-routing.mjs`。
8. channel contract、vendor、packaging strategy、wrapper strategy、或 build/export surface 扩面。
9. 通过 fake-ready / fake-probe 把 requested channels 伪装成 success。

## Functional Requirements

- **FR-001**: packaged install 的 `plugins` phase MUST 不再无限悬挂；必须在显式预算内进入 `completed` / `error` 终态之一。
- **FR-002**: install contract MUST 区分：
  - `safe_bypass`
  - `blocked_degraded`
  - `failed`
- **FR-003**: 对 requested `dingtalk` / `wecom`，只有在 plugin readiness 被 authoritatively 证明成立后，才允许继续把 install 走向 success。
- **FR-004**: 弱迹象（例如 bundled tgz presence、目录存在、文件数稳定、CPU 低、日志停住）MUST NOT 单独构成 safe bypass authority。
- **FR-005**: `safe_bypass` 只允许跳过“等待 install child 继续跑完”这一步，不允许跳过 requested channel readiness gate。
- **FR-006**: 当 requested channel plugin 未 authoritative ready 时，install MUST NOT 报成功，terminal verdict 只能是 `blocked_degraded` 或 `failed`，且 `channelProbes.<requested>.ready` MUST NOT 被伪造为 `true`。
- **FR-007**: 若 bypass 不成立，installer MUST 在受控预算内失败，并给出至少：
  - `blockingStep`
  - `blockingPlugin`
  - root-cause / issue summary
- **FR-008**: install truth SHOULD 默认复用现有 UI 可消费 terminal lane：
  - success → `completed`
  - non-success → `error`
  若 implementation 需要新的 terminal state，MUST stop and escalate for UI adapter。
- **FR-009**: best-effort / skippable 内容仅限不会影响 requested channel readiness truth 的子项。
- **FR-010**: packet 默认 write-set MUST 收窄在 `ui/server.mjs` 与 backend/runtime tests；若需要触达 `ui/public/*` 才能闭环，MUST stop and escalate。
- **FR-011**: install contract 不得改写 internal ids：
  - `opensparrow-router`
  - `opensparrow-router/auto`
- **FR-012**: final closeout MUST 经过 fresh packaged artifact verification；source-level PASS 不得直接宣布 packaged PASS。

## Non-Goals

- 不重写 install wizard UI。
- 不重写 `/api/status` truth。
- 不重开 dashboard model-routing surface。
- 不把 selected channels 裁剪成“后台先装个不完整版本也算成功”。
- 不做 vendor / packaging strategy / Windows follow-up。

## Acceptance

### Source-level acceptance

1. `step=plugins` 不再允许 indefinite hang。
2. source contract 明确冻结：
   - 哪些子项可 best-effort / 可跳过
   - 哪些子项绝不可跳过
3. 对当前 `dingtalk + wecom` 路径，safe bypass 的 predicate 被 source tests 固化；不能再由弱迹象随意成立。
4. requested channel plugin 未 authoritative ready 时，install 不会报 success，也不会落入当前 install UI 的 timeout-like success fallback / redirect lane。
5. no-bypass 场景会在预算内转为受控失败，并返回精确 plugin / stage / root-cause 指示。
6. install contract 仍保持：
   - truth first
   - no fake-ready
   - `opensparrow-router` unchanged
   - `opensparrow-router/auto` unchanged

### Fresh packaged acceptance

最终 closeout 仍需 fresh packaged artifact verification，至少证明：

1. 当前 real packaged install 不再无限停在 `status:"running" / currentStep:"plugins"`。
2. 若某项被 safe bypass，response / install-status 会 truthful 指出 bypass 发生在哪里，同时最终不会把未 ready 的 `dingtalk` / `wecom` 伪装成 success。
3. 若 bypass 不成立，install 只允许落到 `blocked_degraded` 或 `failed` 的 non-success lane，且不会触发当前 install UI 的 timeout-like success fallback / redirect。
4. 若 bypass 不成立，install 会在受控预算内失败，并指出：
   - plugin
   - stage
   - root-cause lane
5. 若 root-cause fix 成功，fresh packaged artifact 中的 `dingtalk + wecom` real install 能再次完成，并给出 authoritative `channelProbes`.

## Ownership Freeze

### Default write-set

- `ui/server.mjs`
- `ui/tests/packaged-dingtalk-install-gate.test.mjs`
- `ui/tests/packaged-wecom-install-gate.test.mjs`
- `ui/tests/packaged-install-retry-guards.test.mjs`
- `ui/tests/packaged-channel-probe-diagnostics.test.mjs`
- `ui/tests/packaged-plugin-install-hang-bypass.test.mjs`

### Read-only authority / context

- `docs/current-status.md`
- `docs/packaged-mac-diagnostics.md`
- `docs/runtime-flow.md`
- `specs/031-dashboard-model-routing-ui/spec.md`
- `specs/032-packaged-runtime-authority-and-restart-truth/spec.md`
- `ui/public/index.html`

### Forbidden write-set

- `ui/public/*`（默认全部禁止）
- `ui/lib/model-routing-config.mjs`
- `scripts/model-routing/lib/custom-plugin-routing.mjs`
- `platforms/**`
- `vendor/**`
- `docs/**`
- `longrun/**`
- 任意 Windows 文件

## Packet Relationship

- `F-031` 已冻结 dashboard model-routing UI surface；本 packet 不重开它。
- `F-032` 已冻结 runtime truthful save/status contract；本 packet 不重开它，只继承 truthful-contract 思路到 install/plugin hang。
- 本 packet 默认没有与 Packet A / Packet B 的 `ui/public/*` shared write-set，因此 backend-only 方案下不需要串行等待。
- 如果 implementation 证明必须引入 install UI 第三种 terminal UX 才能 truthful 闭环，则视为 ownership breach，必须停包回 Commander。

## Risk Notes

| 风险 | 等级 | 缓解方式 |
|------|------|----------|
| 用“目录已经长出来”冒充 plugin ready | 高 | safe bypass predicate 明确排除弱迹象 |
| requested channel 未 ready 仍被 install 成功吞掉 | 高 | success gate 强制绑定 requested-channel readiness |
| 为了结束 hang 把 install contract 偷改成 fake success | 高 | non-success 默认走 `status:error` lane |
| 为了表达 degraded UX 顺手改 install 页面 | 高 | `ui/public/*` 默认 forbidden write-set |
| 根因其实落在 vendor / packaging strategy | 中 | 立即 stop，不在 F-033 内扩 scope |

## Stop Rule

出现以下任一情况，Worker-A 必须立即停包并回 Commander：

1. 需要修改 `ui/public/*` 才能让 truthful bypass / blocked_degraded contract 被消费。
2. 需要修改 vendor、wrapper、packaging strategy、或 build/export 才能解释 plugin hang。
3. 需要改 channel contract、true `F-014`、`F-025-B`、或 true `F-027` / `F-031` / `F-032` identity。
4. 任何方案试图把 requested `dingtalk` / `wecom` 在未 authoritative ready 时写成 success。
5. 任何方案试图改写 `opensparrow-router` 或 `opensparrow-router/auto`。
