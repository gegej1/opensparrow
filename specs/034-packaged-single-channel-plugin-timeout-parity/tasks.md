# Tasks: Packaged Single-Channel Plugin Timeout Parity

**Feature ID**: `F-034`  
**Packet identity**: `packaged single-channel plugin-install parity / operability`  
**Dispatch rule**: 默认只改 `ui/server.mjs` 与 backend/runtime tests；若必须扩到 `ui/public/*`、wrappers、vendor、或 packaging flow，立即停包回 Commander。

## Global Guards

- 这是 backend/runtime parity packet，不是 `F-033` reopen。
- 当前 authority 仍然是 fresh packaged replay truth。
- stale historical PASS 只能作 comparison signal，不能升格为当前 truth。
- 先解释 selection-dependent 分叉，再决定具体修法。
- `dingtalk-only` / `wecom-only` 的默认 closure target 是 truthful success，不是“失败得更真实”。
- `dingtalk+wecom` combined replay 不得回退 `F-033` 已冻结的 truthful non-success。
- `step=plugins` 不允许 indefinite running 回归。
- requested-not-ready 不得 fake-success。
- internal ids 必须保持：
  - `opensparrow-router`
  - `opensparrow-router/auto`
- 不得修改：
  - `ui/public/*`
  - Windows
  - wrappers
  - `vendor/**`
  - packaging strategy
  - docs / longrun closeout

## Ownership Freeze

### Worker-A 允许改动

- `ui/server.mjs`
- `ui/tests/packaged-plugin-install-hang-bypass.test.mjs`
- `ui/tests/packaged-install-retry-guards.test.mjs`
- `ui/tests/packaged-channel-probe-diagnostics.test.mjs`
- `ui/tests/packaged-plugin-profile-sync.test.mjs`
- `ui/tests/packaged-dingtalk-install-gate.test.mjs`
- `ui/tests/packaged-wecom-install-gate.test.mjs`
- `ui/tests/packaged-single-channel-plugin-timeout-parity.test.mjs`

`ui/tests/packaged-single-channel-plugin-timeout-parity.test.mjs` 是本 packet same-artifact / different-selection parity 的必交付、必执行 source authority harness，不得用扩展既有 test file 替代。

### Worker-A 只读

- `docs/current-status.md`
- `docs/packaged-mac-diagnostics.md`
- `docs/runtime-flow.md`
- `specs/030-packaged-dingtalk-wecom-support-closure/spec.md`
- `specs/033-packaged-plugin-install-hang-and-bypass/spec.md`
- `ui/public/index.html`

### Worker-A 禁止改动

- `ui/public/*`
- `platforms/**`
- `vendor/**`
- `docs/**`
- `longrun/**`
- 任意 Windows 文件
- wrappers
- packaging scripts

## Phase 0 — Reproduce The Fresh Replay Matrix

### T034-0 — Turn the three packaged lanes into source authority

**Goal:** 先把 current problem definition 写进 source tests，而不是直接猜修法。

**Must cover:**

1. `dingtalk-only`
2. `wecom-only`
3. `dingtalk+wecom`

**Must observe:**

- `status`
- `installState`
- `blockingStep`
- `blockingPlugin`
- `bypass`
- `requestedChannelReadiness`
- `channelProbes`

**Done when:**

- source harness 能明确区分：
  - single-channel 在 `plugins` fail
  - combined 能进 `probe`
  - `channelProbes` 是否生成
- `ui/tests/packaged-single-channel-plugin-timeout-parity.test.mjs` 已作为本 packet 的独立 source authority harness 冻结下来

## Phase 1 — Root Cause Investigation

### T034-1 — Prove where the selection-dependent divergence lives

**Goal:** 先证实问题落在 selection / sequencing / authority / sync 的哪一层。

**Must inspect first:**

- `handleInstall()`
- `installPluginPackage()`
- `inspectPluginInstallAuthority()`
- `syncInstalledPluginIntoProfile()`
- requested-channel gate metadata

**Must answer:**

1. 为什么 `channels` 在 `dingtalk-only` lane 成为 `blockingPlugin`？
2. 为什么 `wecom-openclaw-plugin` 在 `wecom-only` lane 成为 `blockingPlugin`？
3. 为什么 same fresh artifact 下 combined lane 能越过 `plugins`？

**Must not do:**

- 不得先调大 timeout 再说。
- 不得把 UI / probe 当作主根因。
- 不得把 stale historical PASS 当解释。

**Done when:**

- packet 内已经冻结 primary root-cause layer，而不是只留下“可能是 timeout”。

## Phase 2 — Restore `dingtalk-only` Parity

### T034-2 — Remove or close the `dingtalk-only -> plugins -> channels` divergence

**Goal:** 让 `dingtalk-only` 不再在 fresh packaged replay 中无解释地死在 `plugins`。

**Write-set:**

- `ui/server.mjs`
- relevant backend/runtime tests

**Default target:**

- `dingtalk-only` 能进入 `probe`
- requested DingTalk channel authoritatively ready 时返回 success

**Fallback target when success is impossible within scope:**

- 以 precise non-success contract 结束
- 明确 `blockingPlugin=channels`
- 不 fake-success
- 不 indefinite running

**Done when:**

- `dingtalk-only` lane 被 source tests 与 contract 明确收口。

## Phase 3 — Restore `wecom-only` Parity

### T034-3 — Remove or close the `wecom-only -> plugins -> wecom-openclaw-plugin` divergence

**Goal:** 让 `wecom-only` 不再在 fresh packaged replay 中无解释地死在 `plugins`。

**Write-set:**

- `ui/server.mjs`
- relevant backend/runtime tests

**Default target:**

- `wecom-only` 能进入 `probe`
- requested WeCom channel authoritatively ready 时返回 success

**Fallback target when success is impossible within scope:**

- 以 precise non-success contract 结束
- 明确 `blockingPlugin=wecom-openclaw-plugin`
- 不 fake-success
- 不 indefinite running

**Done when:**

- `wecom-only` lane 被 source tests 与 contract 明确收口。

## Phase 4 — Preserve Combined Truth

### T034-4 — Keep `dingtalk+wecom` on the F-033 truthful lane

**Goal:** 修 single-channel 时，不回退 combined。

**Must keep:**

- `status=error`
- `installState=failed`
- `blockingStep=probe`
- `blockingPlugin=wecom-openclaw-plugin`
- `requestedChannelReadiness={dingtalk:false,wecom:false}`
- `channelProbes.dingtalk.status=warning`
- `channelProbes.dingtalk.ready=false`
- `channelProbes.wecom.status=error`
- `channelProbes.wecom.ready=false`
- six-surface consistency

**Must not do:**

- 不得把 combined non-success 重新写成 `completed`
- 不得让 WeCom auth failure 漂成 `ready=true`
- 不得让 non-success 掉进 success fallback

**Done when:**

- combined replay 在 source tests 里继续保持 `F-033` truth。

## Phase 5 — Surface Consistency

### T034-5 — Lock outward / diagnostics / package-local parity

**Goal:** single-channel 修复后，所有 surface 继续说同一种 truth。

**Must cover:**

- `/api/install`
- `/api/install/status`
- `install-state.json`
- `/api/diagnostics`
- `/api/diagnostics/export`
- `diagnostic-bundle.json`

**Must not do:**

- 不得只改 outward response 而放任 package-local 漂移。
- 不得出现 `channelProbes` outward 有值、package-local 为空，或反过来。

**Done when:**

- same packaged session 的 terminal contract 在六个 surface 中一致。

## Phase 6 — Guard Requested-Not-Ready Truth

### T034-6 — Keep single-channel fallback from turning into fake success

**Goal:** 就算 single-channel 不能恢复 success，也不能伪装成功。

**Must cover:**

1. requested channel 未 ready 时，install 不得返回 success
2. requested-not-ready 不得落入 timeout-like success fallback
3. `blocked_degraded` / `failed` 的 wording 与 structured fields 足够让现有 consumer 识别为 non-success

**Done when:**

- single-channel fallback lane 继续 truth-first，而不是“失败中看起来像成功”。

## Phase 7 — Source Validation

### T034-7 — Run fresh source verification before handoff

**Required commands:**

- `node --check ui/server.mjs`
- `node --test ui/tests/packaged-plugin-install-hang-bypass.test.mjs`
- `node --test ui/tests/packaged-install-retry-guards.test.mjs`
- `node --test ui/tests/packaged-channel-probe-diagnostics.test.mjs`
- `node --test ui/tests/packaged-plugin-profile-sync.test.mjs`
- `node --test ui/tests/packaged-dingtalk-install-gate.test.mjs`
- `node --test ui/tests/packaged-wecom-install-gate.test.mjs`
- `node --test ui/tests/packaged-single-channel-plugin-timeout-parity.test.mjs`

**Evidence must show:**

1. `dingtalk-only` lane 已被明确收口
2. `wecom-only` lane 已被明确收口
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
5. `plugins` 仍无 indefinite running
6. requested-not-ready 不 fake-success
7. backend/runtime-only write-set 仍保持冻结

**Done when:**

- Worker-A 只能向 Commander 报告 `fresh source PASS`
- 不会声称 packaged PASS

## Phase 8 — Fresh Packaged Verification Handoff

### T034-8 — Handoff to packaged verifier

**Verifier must check:**

1. `dingtalk-only` fresh packaged replay
2. `wecom-only` fresh packaged replay
3. `dingtalk+wecom` combined replay
4. combined lane 精确保持当前 frozen `F-033` contract：
   - `status=error`
   - `installState=failed`
   - `blockingStep=probe`
   - `blockingPlugin=wecom-openclaw-plugin`
   - `requestedChannelReadiness={dingtalk:false,wecom:false}`
   - `channelProbes.dingtalk.status=warning`
   - `channelProbes.dingtalk.ready=false`
   - `channelProbes.wecom.status=error`
   - `channelProbes.wecom.ready=false`
5. internal ids 保持：
   - `opensparrow-router`
   - `opensparrow-router/auto`
6. `plugins` 仍无 indefinite running
7. requested-not-ready 不会 fake-success
8. six surfaces 一致

**Expected packaged verdict:**

- default：single-channel success restored, combined truth preserved
- fallback：single-channel precise non-success, combined truth preserved, packet returns `Decision Required`

**Done when:**

- packet 被送到 `ready for fresh packaged verification`
- closer / verifier 可以独立判断本 packet 是否达到 Commander 期望
- combined exact frozen truth 或 internal-id invariant 任一漂移时不得判 PASS

## Hard Stop Rules

出现以下情况必须立即停包并回 Commander：

1. 必须修改 `ui/public/*` 才能 truthful 消费 terminal contract。
2. 必须修改 vendor / wrappers / packaging strategy 才能恢复 single-channel parity。
3. root-cause investigation 指向 stale historical artifact，而不是 fresh packaged replay。
4. 任何实现让 requested-not-ready 的 lane 返回 success。
5. 任何实现改动 `opensparrow-router` 或 `opensparrow-router/auto`。
