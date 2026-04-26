# Packaged Single-Channel Plugin Timeout Parity Implementation Plan

> **For agentic workers:** 本计划只允许执行 packaged single-channel plugin parity packet。默认 write-set 限定在 `ui/server.mjs` 与 backend/runtime tests；若需要改 `ui/public/*`、wrappers、vendor、或 packaging flow，必须先回 Commander 请求新的 ownership freeze。

**Goal:** 解释并收口 fresh packaged replay 下 `dingtalk-only` / `wecom-only` 在 `plugins` 阶段 bounded fail 的 selection-dependent 分叉，优先恢复 single-channel packaged install 的 truthful success，同时保证 `dingtalk+wecom` combined replay 不回退 `F-033` 已冻结的 truthful non-success 与 bounded verdict。  
**Architecture:** 继续以 `ui/server.mjs` 为唯一主写面，围绕 `handleInstall()`、`installPluginPackage()`、plugin authority inspection、以及 shared/profile extension sync 做 selection-parity root-cause investigation，然后用 backend/runtime tests 锁住 single-channel / combined matrix。默认不碰 `ui/public/*`，并继续复用现有 `completed|error` terminal lane。  
**Tech Stack:** Node ESM backend（`ui/server.mjs`）、package-local install tracker / diagnostics、`node:test` backend/runtime tests、fresh packaged replay verifier。

---

## 0. Plan Positioning

- 这是新的 packaged single-channel parity packet。
- 这不是 `F-033` 的 reopen。
- 这不是 fake-success family 的续修。
- 这不是 indefinite-running family 的续修。
- 这不是 Windows packet。
- 这不是 docs / longrun closeout packet。

## 1. 为什么新 packet 仍然应保持 backend/runtime-only

fresh packaged truth 已经明确表明：

1. single-channel 两条路径都在 `plugins` 失败；
2. `channelProbes` 全为 `null`，说明还没到 probe/readback；
3. `blockingPlugin` 已经能够精确指向 `channels` 或 `wecom-openclaw-plugin`；
4. combined 路径已经证明后续 `probe` / diagnostics / surface consistency contract 仍然可用。

因此当前最合理的执行方式仍然是 backend/runtime-only：

- 先把 selection-dependent plugin-install 分叉解释清楚；
- 先在 `ui/server.mjs` 与 source tests 内恢复 parity；
- 只有在证据证明现有 terminal contract 无法被当前 UI truthful 消费时，才允许升级为 UI adapter packet。

## 2. Why This Is New Work Instead Of Expanding F-033

`F-033` 已冻结的内容是：

- `dingtalk+wecom` combined path 的 safe-bypass / truthful non-success；
- no fake success；
- no indefinite running。

本 packet 新增的工作是：

- `dingtalk-only`
- `wecom-only`
- same fresh artifact、different channel selection

也就是说，本 packet 不只是增加两条测试，而是要新增一个新的 decision surface：

> current packaged plugin-install authority / sequencing 是否对 single-channel selection 具有 parity？

这个问题在 `F-033` 里没有冻结，也不应该 retroactively 写回 `F-033`。

## 3. File Structure / Ownership

### Worker-A 默认允许改动

- `ui/server.mjs`
  - 作用：single-channel / combined plugin parity 的唯一 authoritative install contract 主写面。
- `ui/tests/packaged-plugin-install-hang-bypass.test.mjs`
  - 作用：继续保护 `F-033` 的 plugin hang / truthful non-success contract。
- `ui/tests/packaged-install-retry-guards.test.mjs`
  - 作用：继续保护 `plugins` stage bounded verdict 与 wording guards。
- `ui/tests/packaged-channel-probe-diagnostics.test.mjs`
  - 作用：保护 channel probe / diagnostics 六 surface 一致性。
- `ui/tests/packaged-plugin-profile-sync.test.mjs`
  - 作用：保护 packaged plugin shared/profile extension sync 合同。
- `ui/tests/packaged-dingtalk-install-gate.test.mjs`
  - 作用：保护 DingTalk plugin gate。
- `ui/tests/packaged-wecom-install-gate.test.mjs`
  - 作用：保护 WeCom plugin gate。
- `ui/tests/packaged-single-channel-plugin-timeout-parity.test.mjs`
  - 作用：作为本 packet same-artifact / different-selection parity 的必交付、必执行 source authority harness，独立锁住 `dingtalk-only` / `wecom-only` / combined 的 selection matrix。

### Worker-A 只读 authority / context

- `docs/current-status.md`
- `docs/packaged-mac-diagnostics.md`
- `docs/runtime-flow.md`
- `specs/030-packaged-dingtalk-wecom-support-closure/spec.md`
- `specs/033-packaged-plugin-install-hang-and-bypass/spec.md`
- `ui/public/index.html`

### Worker-A 默认禁止改动

- `ui/public/*`
- `platforms/**`
- `vendor/**`
- `docs/**`
- `longrun/**`
- 任意 Windows 文件
- wrappers
- packaging scripts

## 4. Current Working Diagnosis

本 packet 的执行顺序必须建立在以下 working diagnosis 上：

1. primary suspect 不是 UI，而是 backend/runtime install path；
2. primary suspect 不是 probe/readback，因为 single-channel 根本没有进入 probe；
3. primary suspect 也不应先简化成“timeout 太短”，因为 combined path 已经证明当前 packaged flow 在某些 selection 下能越过 `plugins`；
4. 最优先要验证的是：
   - selection-dependent plugin install sequencing
   - packaged plugin authority predicate
   - shared/profile extension sync parity

当前代码中最需要被对照检查的链路是：

- `handleInstall()`
- `installPluginPackage()`
- `inspectPluginInstallAuthority()`
- `syncInstalledPluginIntoProfile()`
- requested channel gate / install tracker metadata

## 5. Implementation Order

### Phase 0 — Reproduce The Selection Matrix In Source Harness First

先把以下 matrix 变成 source-level authority：

1. `dingtalk-only`
2. `wecom-only`
3. `dingtalk+wecom`

source harness 必须能回答：

- 哪一条 lane 在 `plugins` fail
- fail 时的 `blockingPlugin`
- 是否到达 `probe`
- `channelProbes` 是否生成
- `requestedChannelReadiness` 如何写回

这一步的目标不是立即修，而是先确保 source tests 与 fresh packaged replay 站在同一个问题定义上。

本 packet 的 source authority harness 固定为 `ui/tests/packaged-single-channel-plugin-timeout-parity.test.mjs`；不允许以扩展现有 hang-bypass test file 替代。

### Phase 1 — Freeze The Exact Divergence Layer

在不扩大 write-set 的前提下，Worker-A 必须证明当前分叉主要落在哪一层：

1. selection-dependent install path
2. plugin install sequencing
3. authority predicate
4. shared/profile sync path
5. timeout budget

优先级要求：

- 先查 selection / sequencing / authority / sync；
- 只有 evidence 指向 timeout budget 时，才允许把 timeout 当主根因；
- 不允许把“combined 能过、single 过不去”的问题偷换成 generic timeout tuning。

### Phase 2 — Restore `dingtalk-only` Packaged Operability

针对 `dingtalk-only`：

1. 解释为什么 `channels` 会在 single-channel selection 下成为 `blockingPlugin`；
2. 收口该分叉；
3. 默认目标是让 `dingtalk-only` 进入 `probe` 并恢复 truthful success；
4. 如果 root-cause 证明单靠 backend/runtime 无法恢复 success，则把 failure contract 精确冻结，而不是留在“HTTP 500 + plugins fail”。

### Phase 3 — Restore `wecom-only` Packaged Operability

针对 `wecom-only`：

1. 解释为什么 `wecom-openclaw-plugin` 会在 single-channel selection 下成为 `blockingPlugin`；
2. 收口该分叉；
3. 默认目标是让 `wecom-only` 进入 `probe` 并恢复 truthful success；
4. 若无法恢复 success，必须输出 Commander 可裁决的 precise non-success contract。

### Phase 4 — Preserve Combined `dingtalk+wecom` Truth

无论 single-channel 如何修，combined 路径都必须继续保持：

- `status=error`
- `installState=failed`
- `blockingStep=probe`
- `blockingPlugin=wecom-openclaw-plugin`
- `requestedChannelReadiness={dingtalk:false,wecom:false}`
- `channelProbes.dingtalk.status=warning`
- `channelProbes.dingtalk.ready=false`
- `channelProbes.wecom.status=error`
- `channelProbes.wecom.ready=false`
- no fake success
- no indefinite running
- six-surface consistency

这一阶段的目标是保证：

- `F-034` 不会用 single-channel success 恢复去换 combined regression；
- `F-033` 的 truth-first contract 不被回退。

### Phase 5 — Lock Package-Local / Diagnostics / Outward Surface Consistency

不允许只修 `/api/install` 返回体，而忽略 package-local / diagnostics 面。

至少要继续保护：

- `/api/install`
- `/api/install/status`
- `install-state.json`
- `/api/diagnostics`
- `/api/diagnostics/export`
- `diagnostic-bundle.json`

single-channel 修复后的 terminal verdict 必须在以上 surfaces 中一致。

### Phase 6 — Fresh Source Closure

source-level 完成后，Worker-A 只能报告：

- fresh source PASS
- ready for fresh packaged replay verification

不得直接宣布 packaged PASS。

## 6. Verification Plan

### Source-level verification

至少执行：

- `node --check ui/server.mjs`
- `node --test ui/tests/packaged-plugin-install-hang-bypass.test.mjs`
- `node --test ui/tests/packaged-install-retry-guards.test.mjs`
- `node --test ui/tests/packaged-channel-probe-diagnostics.test.mjs`
- `node --test ui/tests/packaged-plugin-profile-sync.test.mjs`
- `node --test ui/tests/packaged-dingtalk-install-gate.test.mjs`
- `node --test ui/tests/packaged-wecom-install-gate.test.mjs`
- `node --test ui/tests/packaged-single-channel-plugin-timeout-parity.test.mjs`

### Fresh packaged verification handoff

verifier 必须重放：

1. `dingtalk-only`
2. `wecom-only`
3. `dingtalk+wecom`

并确认：

1. single-channel 默认恢复 truthful success；
2. 若未恢复，terminal contract precise 且 Commander 可裁决；
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
5. `plugins` 不再 indefinite running；
6. requested-not-ready 不会 fake-success；
7. package-local / diagnostics / outward surfaces 一致。

## 7. Stop Conditions

出现以下情况必须立即停止并回 Commander：

1. 需要改 `ui/public/*` 才能 truthful 表达 single-channel terminal contract。
2. 需要改 vendor / packaging strategy / wrapper flow 才能解释当前 selection-dependent 分叉。
3. root-cause investigation 指向 Windows 或其它跨平台线。
4. 有人试图用 stale historical PASS 替代 fresh packaged replay truth。
5. 有人试图把 requested-not-ready 的 single-channel lane 写成 success。
