# Feature Specification: Packaged Single-Channel Plugin Timeout Parity

**Feature ID**: `F-034`  
**Feature Branch**: `034-packaged-single-channel-plugin-timeout-parity`  
**Created**: `2026-04-23`  
**Status**: `Completed (source PASS + fresh packaged PASS, 2026-04-24)`  
**Input**: Commander 已冻结 fresh packaged truth：`F-033` 已关闭 fake-success family 与 `step=plugins` indefinite running，但 fresh clean packaged replay 暴露出新的 selection-dependent operability gap。同一 fresh artifact 上，`dingtalk+wecom` 组合路径已经能越过 `plugins` 到 `probe` 并以 truthful non-success 结束；而 `dingtalk-only` 与 `wecom-only` 都在 `plugins` 阶段 bounded fail，`channelProbes` 全为 `null`，且 `/api/install` 直接返回 `HTTP 500`。该分叉不是 UI 问题，不是 fake-success family，也不是 indefinite running family。

## Closeout Evidence (`2026-04-24`)

本轮 closeout 只基于 fresh packaged replay，不基于 stale historical PASS。

fresh closeout evidence roots：

- artifact dir：`/private/tmp/f034-packaged-rebuild-lT3AVc/gtclaw-mac-release-arm64-20260424-003358/GTClaw-0.1.0-alpha-macOS-arm64`
- artifact zip：`/private/tmp/f034-packaged-rebuild-lT3AVc/gtclaw-mac-release-arm64-20260424-003358.zip`
- replay root：`/private/tmp/f034-packaged-round5-replays-MOZFDx`
- capture root：`/private/tmp/f034-packaged-round5-captures-rhqPgf`

已确认：

- `F-034` 已 source PASS + fresh packaged PASS
- `step=plugins` 没有 regression 回到 indefinite running / fake success
- router invariants 保持：
  - `providerId=opensparrow-router`
  - `modelTarget=opensparrow-router/auto`

`dingtalk-only`

- `/api/install = HTTP 200`
- final `status=completed`
- final `installState=completed`
- `blockingStep=null`
- `blockingPlugin=null`
- `bypass={verdict:none, used:false}`
- `requestedChannelReadiness={dingtalk:true,wecom:true}`
- `channelProbes.dingtalk={status:ok, ready:true}`
- `six-surface consistency=true`
- passing replay 观察到 `staged-shell -> critical-dist -> final-authority lag` signature，但这次没有真的跨过 `120000ms` timeout，因此 fresh PASS 不是靠 timeout safe_bypass 触发的

`wecom-only`

- `/api/install = HTTP 200`
- final `status=completed`
- final `installState=completed`
- `blockingStep=null`
- `blockingPlugin=null`
- `bypass={verdict:none, used:false}`
- `requestedChannelReadiness={dingtalk:true,wecom:true}`
- `channelProbes.wecom={status:ok, ready:true}`
- `six-surface consistency=true`

`dingtalk+wecom`

- `/api/install = HTTP 500`
- final `status=error`
- final `installState=failed`
- `blockingStep=probe`
- `blockingPlugin=wecom-openclaw-plugin`
- `bypass={verdict:failed, used:false, plugin:wecom-openclaw-plugin}`
- `requestedChannelReadiness={dingtalk:false,wecom:false}`
- `channelProbes.dingtalk={status:warning, ready:false}`
- `channelProbes.wecom={status:error, ready:false}`
- `six-surface consistency=true`
- 这是 exact frozen `F-033` probe truth，已保持

residual facts only：

- `dingtalk-only` 这次 passing replay 没直接 exercise packaged timeout+grace-wait path
- `wecom-only` 是 config-only probe summary，但在当前 acceptance 下仍是 packaged PASS
- 这些 residual risks 不升格为 blocker

## 一句话定义

`F-034` 是一个只为 fresh packaged replay 下 single-channel plugin-install parity / operability gap 单开的新 packet；它必须解释为什么 `dingtalk+wecom` 能越过 `plugins` 到 `probe`，而 `dingtalk-only` / `wecom-only` 都在 `plugins` bounded fail，并优先把单通道 packaged install 恢复为 truthful success；若在 backend/runtime-only write-set 内无法恢复，则必须把失败收束为更精确、不会伪装成功的 truthful terminal contract。

## 为什么这是新 packet，而不是继续扩大 F-033

`F-033` 的问题定义和验收面已经冻结为：

- 关闭 packaged `step=plugins` indefinite running；
- 关闭 fake-success family；
- 把 `dingtalk+wecom` 组合路径收束为 truthful non-success；
- 锁住 `/api/install`、`/api/install/status`、`install-state.json`、`/api/diagnostics`、`/api/diagnostics/export`、`diagnostic-bundle.json` 六个 surface 的一致性。

当前 fresh packaged replay 暴露的是一个新的 family：

1. 它只在 single-channel selection 下出现，而不是 `dingtalk+wecom` 组合路径；
2. 它发生在 `plugins` 阶段，`channelProbes` 根本没有生成，说明问题在 probe 之前；
3. 它讨论的是 packaged single-channel operability / parity，而不是 F-033 已收口的 fake-success 或 indefinite running；
4. 它的验收矩阵从“组合路径 truthfulness”变成了“single-channel 与 combined 的 selection parity”。

因此它必须单开为新 packet，避免：

- 反向改写 `F-033` 已冻结的问题定义；
- 把 single-channel operability gap 混写成 fake-success family 的续篇；
- 用 stale historical PASS 覆盖 fresh packaged replay truth。

## Follow-up Freeze

- 当前 authority 仍然是 fresh packaged replay truth，不是 historical clean-state packaged PASS。
- historical packaged PASS 只允许作为 comparison signal，不得升格为当前 authority。
- 本 packet 默认是 backend/runtime-only。
- 默认 write-set 只允许落在：
  - `ui/server.mjs`
  - backend/runtime tests
- 默认不碰：
  - `ui/public/*`
  - Windows
  - `vendor/**`
  - wrappers
  - packaging strategy
  - docs / longrun closeout
- 不 reopen：
  - Packet A
  - `F-031`
  - `F-032`
  - `F-033` fake-success family
- internal ids 必须保持：
  - `opensparrow-router`
  - `opensparrow-router/auto`

## Authority / Truth Source

本 packet 的 authority 顺序固定为：

1. 用户本轮 frozen truth 与禁改约束。
2. `AGENTS.md` 与 `.specify/memory/constitution.md`。
3. 本 packet 的 `spec.md / plan.md / tasks.md`。
4. 当前 worktree 中与 packaged diagnostics 直接相关的 frozen docs：
   - `docs/current-status.md`
   - `docs/packaged-mac-diagnostics.md`
   - `docs/runtime-flow.md`
5. 当前 backend/runtime install contract：
   - `ui/server.mjs`
6. 与 install/runtime parity 直接相关的 backend tests：
   - `ui/tests/packaged-plugin-install-hang-bypass.test.mjs`
   - `ui/tests/packaged-install-retry-guards.test.mjs`
   - `ui/tests/packaged-channel-probe-diagnostics.test.mjs`
   - `ui/tests/packaged-plugin-profile-sync.test.mjs`
   - `ui/tests/packaged-dingtalk-install-gate.test.mjs`
   - `ui/tests/packaged-wecom-install-gate.test.mjs`

边界说明：

- `docs/current-status.md` 中 historical packaged PASS 仍然成立，但只能作为 comparison signal。
- `F-033` 已冻结的 truthful non-success 与 bounded verdict 继续有效，不可回退。
- 若 frozen docs 与当前 fresh packaged replay truth 冲突，以本轮 frozen truth 为准。

## Initial Frozen Truth (`2026-04-23` divergence freeze; historical context only)

以下条目记录的是本 packet 开始时的 divergence freeze，已被上方 `2026-04-24` closeout evidence supersede，不再代表当前 packaged state。

### 1. F-033 已关闭 fake-success family

在 `dingtalk+wecom` fresh packaged replay 中：

- WeCom 鉴权错误 `Authentication failed: invalid bot_id or secret ... (code: 853000)` 不再被写成 `channelProbes.wecom.status="ok"` 或 `ready=true`；
- 组合路径不再被写成 `completed`；
- 当前 truthful non-success 结论为：
  - final `installState=failed`
  - final `status=error`
  - `blockingStep=probe`
  - `blockingPlugin=wecom-openclaw-plugin`
  - `requestedChannelReadiness={dingtalk:false,wecom:false}`
  - `channelProbes.dingtalk.status=warning, ready=false`
  - `channelProbes.wecom.status=error, ready=false`
- 六个 outward / package-local surfaces 一致：
  - `/api/install`
  - `/api/install/status`
  - `install-state.json`
  - `/api/diagnostics`
  - `/api/diagnostics/export`
  - `diagnostic-bundle.json`

### 2. `step=plugins` indefinite running 已关闭

- 三条 fresh replay 都没有再无限卡在 `running/plugins`；
- bounded verdict 继续有效，不得回退。

### 3. fresh packaged artifact authority

- fresh artifact：
  - `/private/tmp/f033-packaged-rebuild-KcuOzH/gtclaw-mac-release-arm64-20260423-170015/GTClaw-0.1.0-alpha-macOS-arm64`
- fresh zip replay：
  - `/private/tmp/f033-packaged-replay-ODdI9K/*`

### 4. single-channel fresh packaged replay 新事实

#### `dingtalk-only`

- `POST /api/install` → `HTTP 500`
- final `installState=failed`
- final `status=error`
- `currentStep=plugins`
- `blockingPlugin=channels`
- `bypass=failed, used=false`
- `requestedChannelReadiness={dingtalk:false,wecom:true}`
- `channelProbes.dingtalk = null`
- `channelProbes.wecom = null`

#### `wecom-only`

- `POST /api/install` → `HTTP 500`
- final `installState=failed`
- final `status=error`
- `currentStep=plugins`
- `blockingPlugin=wecom-openclaw-plugin`
- `bypass=failed, used=false`
- `requestedChannelReadiness={dingtalk:true,wecom:false}`
- `channelProbes.dingtalk = null`
- `channelProbes.wecom = null`

### 5. 这说明什么

- 这不是 UI 问题；
- 这不是 fake-success family；
- 这不是 indefinite running；
- 这是 fresh packaged single-channel plugin-install parity / operability 的新 backend/runtime gap；
- 组合路径能越过 `plugins` 到 `probe`，但两个 single-channel 路径都在 `plugins` bounded fail，这个 selection-dependent 分叉必须被解释并冻结。

## 核心问题

本 packet 必须回答以下问题：

1. 为什么 `dingtalk+wecom` 能越过 `plugins` 到 `probe`，而 `dingtalk-only` / `wecom-only` 都在 `plugins` bounded fail？
2. 这个问题主要落在哪一层：
   - selection-dependent install path
   - plugin install sequencing
   - authority predicate
   - timeout budget
   - shared/profile sync path
3. 当前 single-channel packaged install 的期望 contract 应该是什么？
4. 若要恢复 success，最小 backend/runtime write-set 应该落在哪里？
5. 如何保证不回退 `F-033` 已关闭的 truth family？

## Current Diagnostic Read

### 已确认的结论

1. single-channel 两条路径都在 `plugins` 前置失败，`channelProbes` 全为 `null`，因此 probe 不是根因层。
2. 当前 failure 是 bounded 的，并带 `blockingPlugin`，因此 indefinite-running family 已经关闭。
3. `dingtalk+wecom` 与 single-channel 使用的是同一 fresh artifact lineage，因此分叉是 selection-dependent 的，不是 artifact lineage 切换。
4. 当前 combined path 已经证明：
   - backend/runtime 可以在某些 selection 下越过 `plugins`；
   - F-033 的 truthful probe/readback contract 仍然可用。

### 工作性根因判断（本 packet 需要证实或证伪）

当前最可能的问题层不是 UI，也不是 probe/readback，而是：

- **primary layer**：selection-dependent install path / plugin install sequencing
- **direct mechanism**：`ui/server.mjs` 内 `handleInstall()` 与 `installPluginPackage()` 对 single-channel 请求的 plugin authority 闭环不具备 parity
- **supporting sub-layer**：`inspectPluginInstallAuthority()` / `syncInstalledPluginIntoProfile()` 的 authority predicate 与 shared/profile extension sync 路径，在 single-channel timeout/fail lane 上没有和 combined selection 保持等价
- **secondary concern**：timeout budget 可能放大了该分叉，但目前不应先把问题归因成“只需要调大 timeout”

换句话说，本 packet 当前冻结的工作假设是：

> 这是一个 selection-dependent backend/runtime install-path 问题，其核心不在 UI，不在 probe，不在 fake-success，不在 indefinite-running；timeout budget 与 sync path 需要被调查，但应从 plugin install sequencing + authority closure 的不对称性入手。

该判断来自三条证据：

1. single-channel 两条路径都在 `plugins` 失败且 `channelProbes=null`；
2. combined path 已能进入 `probe`，说明下游阶段不是通用 blocker；
3. 当前代码中的 packaged safe-bypass / plugin readiness authority 直接绑定在 plugin footprint 与 profile sync 上，而现有 tests 主要锁 combined truth，不锁 fresh packaged single-channel parity。

## 期望 Contract

### 默认目标：恢复 truthful success

single-channel packaged install 的默认目标不是“失败得更真实”，而是：

1. `dingtalk-only` fresh packaged replay 能真实完成单通道 install；
2. `wecom-only` fresh packaged replay 能真实完成单通道 install；
3. 只有 requested channel authoritatively ready 时，install 才能返回 success。

换言之，本 packet 的默认 closure target 是：

- `dingtalk-only` → truthful success
- `wecom-only` → truthful success
- `dingtalk+wecom` → 不回退当前 `F-033` truthful non-success contract

### Fallback contract：只在 success 无法恢复时使用

如果 root-cause investigation 证明：

- 无法在 backend/runtime-only write-set 内恢复 single-channel operability；
- 或 fresh packaged truth 指向 vendor / packaging / wrapper 层；

则本 packet允许退回到更精确的 truthful terminal contract，但它不是默认成功标准。

该 fallback 至少必须满足：

- `status=error`
- `installState=failed` 或 `blocked_degraded`
- `blockingStep`
- `blockingPlugin`
- `requestedChannelReadiness`
- `bypass`
- `channelProbes` truth
- outward / package-local / diagnostics surfaces 一致
- 不落入 success fallback

## Scope

### In Scope

1. 解释 fresh packaged replay 下 `dingtalk-only` / `wecom-only` 在 `plugins` 阶段 bounded fail 的 selection-dependent 分叉。
2. 在 backend/runtime write-set 内恢复 single-channel packaged install parity，优先恢复 truthful success。
3. 若无法恢复 success，则把 single-channel terminal contract 收束为更精确的 truthful non-success。
4. 锁住 combined `dingtalk+wecom` replay 不回退。
5. 继续保护：
   - no fake success
   - no indefinite running
   - requested not ready 不落入 success fallback
   - internal ids 不漂移

### Out of Scope

- `ui/public/*`
- Windows
- wrappers
- `vendor/**`
- packaging strategy
- `F-031` / `F-032` / `F-033` identity rewrite
- docs / longrun closeout
- root worktree noisy state 的清理或吸收

## Functional Requirements

- **FR-001**: `dingtalk-only` fresh packaged replay MUST 不再在 clean packaged 条件下无解释地 bounded fail 于 `plugins`；默认目标是进入 `probe` 并在 requested DingTalk channel ready 后返回 success。
- **FR-002**: `wecom-only` fresh packaged replay MUST 不再在 clean packaged 条件下无解释地 bounded fail 于 `plugins`；默认目标是进入 `probe` 并在 requested WeCom channel ready 后返回 success。
- **FR-003**: backend/runtime MUST 能解释 single-channel 与 combined selection 在 `plugins` 阶段的分叉，并把分叉收束为可验证的 contract，而不是“偶发行为”。
- **FR-004**: 当前 `dingtalk+wecom` combined replay MUST 保持 `F-033` 已冻结的 truthful non-success contract，不得回退到 fake success 或 `completed`。
- **FR-005**: `step=plugins` MUST 继续保持 bounded verdict；不得重新引入 indefinite running。
- **FR-006**: requested channel 未 ready 时，MUST NOT 返回 success，也 MUST NOT 落入 timeout-like success fallback。
- **FR-007**: `/api/install`、`/api/install/status`、`install-state.json`、`/api/diagnostics`、`/api/diagnostics/export`、`diagnostic-bundle.json` MUST 对同一 packaged session 给出一致结论。
- **FR-008**: internal ids MUST 保持：
  - `opensparrow-router`
  - `opensparrow-router/auto`
- **FR-009**: 本 packet 的默认实现 write-set MUST 限定在 backend/runtime：
  - `ui/server.mjs`
  - backend/runtime tests

## Candidate Write-Set

默认候选 write-set 冻结为：

- `ui/server.mjs`
- `ui/tests/packaged-plugin-install-hang-bypass.test.mjs`
- `ui/tests/packaged-install-retry-guards.test.mjs`
- `ui/tests/packaged-channel-probe-diagnostics.test.mjs`
- `ui/tests/packaged-plugin-profile-sync.test.mjs`
- `ui/tests/packaged-dingtalk-install-gate.test.mjs`
- `ui/tests/packaged-wecom-install-gate.test.mjs`
- `ui/tests/packaged-single-channel-plugin-timeout-parity.test.mjs`

`ui/tests/packaged-single-channel-plugin-timeout-parity.test.mjs` 是本 packet same-artifact / different-selection parity 的必交付、必执行 source harness，不允许以扩展现有 test file 替代。

默认不允许扩出以上 write-set；若必须触达 `ui/public/*`、wrappers、vendor 或 packaging flow，必须停包回 Commander。

## Acceptance Matrix

| Lane | Required result | Notes |
| --- | --- | --- |
| `dingtalk-only` fresh packaged replay | 默认恢复到 truthful success；至少不再在 `plugins` 无解释 bounded fail | 若无法恢复，必须给出 Commander 可裁决的 precise blocked/fail contract，并说明为何 backend/runtime-only 无法修复 |
| `wecom-only` fresh packaged replay | 默认恢复到 truthful success；至少不再在 `plugins` 无解释 bounded fail | 若无法恢复，必须给出 Commander 可裁决的 precise blocked/fail contract，并说明为何 backend/runtime-only 无法修复 |
| `dingtalk+wecom` combined replay | MUST 精确保持当前 frozen `F-033` contract：`status=error`、`installState=failed`、`blockingStep=probe`、`blockingPlugin=wecom-openclaw-plugin`、`requestedChannelReadiness={dingtalk:false,wecom:false}`、`channelProbes.dingtalk.status=warning`、`channelProbes.dingtalk.ready=false`、`channelProbes.wecom.status=error`、`channelProbes.wecom.ready=false` | 任何字段漂移都算 regression；不得仅以“仍是 non-success”判 PASS |
| `plugins` stage | 不允许 indefinite running 回归 | bounded verdict 继续有效 |
| requested not ready | 不允许 fake success | non-success 不得落入 success fallback |
| package-local / diagnostics / outward surfaces | 六个 surface 一致 | 不得出现 outward 与 install-state / diagnostics 漂移 |
| internal ids | MUST 保持 `opensparrow-router` 与 `opensparrow-router/auto` | closer / verifier 在 id 漂移时不得判 PASS |

## Verification Contract

### Source-level verification

至少需要保护：

- single-channel timeout / failure / bypass parity
- shared/profile extension sync parity
- combined replay non-regression
- requested-not-ready no fake success
- six-surface consistency
- `ui/tests/packaged-single-channel-plugin-timeout-parity.test.mjs` 作为本 packet 的独立 source authority harness 持续存在并参与执行

### Fresh packaged verification

verifier 至少要重放：

1. `dingtalk-only` fresh packaged replay
2. `wecom-only` fresh packaged replay
3. `dingtalk+wecom` combined replay

并确认：

1. `plugins` 不再无限 running；
2. single-channel 默认恢复 success，或带 precise non-success；
3. combined lane 精确保持当前 frozen `F-033` contract：
   - `status=error`
   - `installState=failed`
   - `blockingStep=probe`
   - `blockingPlugin=wecom-openclaw-plugin`
   - `requestedChannelReadiness={dingtalk:false,wecom:false}`
   - `channelProbes.dingtalk.status=warning`
   - `channelProbes.dingtalk.ready=false`
   - `channelProbes.wecom.status=error`
   - `channelProbes.wecom.ready=false`
4. internal ids 保持：
   - `opensparrow-router`
   - `opensparrow-router/auto`
5. requested not ready 不会 fake-success；
6. outward / diagnostics / package-local surfaces 一致。

## Risks / Open Questions

1. 当前 selection-dependent 分叉到底是一个共用根因，还是 `channels` 与 `wecom-openclaw-plugin` 各自独立的问题，仍需在 backend/runtime 层证实。
2. 若 fresh packaged truth 最终指向 vendor/plugin installer 内部行为，而不是 `ui/server.mjs` 可控层，本 packet 必须停在 backend/runtime boundary，不得越界修改 `vendor/**`。
3. single-channel parity 是否需要一个新的 source harness 来重放 “same artifact, different selection” matrix，目前大概率需要，但可在 plan 中最终冻结。
4. 当前 `dingtalk-only` 与 `wecom-only` 的默认 closure target 是 success；若 investigation 证明达不到，必须回 Commander 做 contract 裁决，而不是把 fallback fail 直接写成 PASS。

## Hard Stop Conditions

出现以下任一情况必须停止并回 Commander：

1. 必须修改 `ui/public/*` 才能表达 truthful terminal contract。
2. 必须修改 Windows、wrappers、vendor、或 packaging strategy 才能恢复 single-channel parity。
3. 有人试图用 stale historical PASS 覆盖 fresh packaged replay truth。
4. 有人试图让 requested-not-ready 的 single-channel 路径返回 success。
5. 有人试图借本 packet 修改 `opensparrow-router` 或 `opensparrow-router/auto`。
