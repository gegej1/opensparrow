# Tasks: Packaged Plugin Install Hang and Bypass

**Feature ID**: `F-033`  
**Packet identity**: `packaged install plugin-hang + safe-bypass gating follow-up`  
**Dispatch rule**: 默认只改 `ui/server.mjs` 与 backend/runtime tests；若需要 install UI adapter 才能 truthful 闭环，立即停包回 Commander。

## Global Guards

- 这是 backend/runtime install packet，不是 Packet A / Packet B reopen。
- 先判 bypass，再决定 fail-fast 还是修 hang。
- `step=plugins` 不允许 indefinite hang。
- requested `dingtalk` / `wecom` 未 authoritative ready 时，install 不得报成功。
- 当前 `dingtalk + wecom` live 起点固定为：暂无已证明的 safe bypass。
- safe bypass 不能建立在弱迹象上。
- requested channel 未 ready 时，terminal verdict 只能是 `blocked_degraded` 或 `failed`，且 outward lane 必须保持 non-success。
- requested channel 未 ready 时，不得返回任何会被当前 `ui/public/index.html` timeout-like fallback 送入 `waitUntilInstalled()` / success redirect 的 response shape。
- internal provider id 必须保持 `opensparrow-router`。
- internal target 必须保持 `opensparrow-router/auto`。
- 不得修改 Windows、`F-025-B`、true `F-014`、true `F-027` / `F-031` / `F-032` identity、channel contract、vendor、packaging strategy。
- source-level 完成后仍需 fresh packaged artifact verification，Worker-A 不得自行宣布最终 close。

## Ownership Freeze

### Worker-A 允许改动

- `ui/server.mjs`
- `ui/tests/packaged-dingtalk-install-gate.test.mjs`
- `ui/tests/packaged-wecom-install-gate.test.mjs`
- `ui/tests/packaged-install-retry-guards.test.mjs`
- `ui/tests/packaged-channel-probe-diagnostics.test.mjs`
- `ui/tests/packaged-plugin-install-hang-bypass.test.mjs`

### Worker-A 只读

- `docs/current-status.md`
- `docs/packaged-mac-diagnostics.md`
- `docs/runtime-flow.md`
- `specs/031-dashboard-model-routing-ui/spec.md`
- `specs/032-packaged-runtime-authority-and-restart-truth/spec.md`
- `ui/public/index.html`

### Worker-A 禁止改动

- `ui/public/*`
- `ui/lib/model-routing-config.mjs`
- `scripts/model-routing/lib/custom-plugin-routing.mjs`
- `platforms/**`
- `vendor/**`
- `docs/**`
- `longrun/**`
- 任意 Windows 文件

## Phase 0 — Bypass Authority Gate

### T033-0 — Decide whether safe bypass is even eligible

**Goal:** 在真正写逻辑前冻结 bypass predicate。

**Must answer first:**

1. 对 `dingtalk`，什么才算 `channels` 已 authoritatively ready to continue？
2. 对 `wecom`，什么才算 `wecom-openclaw-plugin` 已 authoritatively ready to continue？
3. 哪些证据只能算弱迹象，绝不能单独触发 bypass？

**Must reject as sole authority:**

- bundled tgz presence
- 目录存在
- 文件数 / 体积稳定
- 低 CPU
- install.log 长时间不更新

**Blocked when:**

- Worker-A 无法给 requested plugin 定义 strong authority predicate；
- 或 predicate 只能靠弱迹象成立。

## Phase 1 — Plugin-Phase Substage Truth

### T033-1 — Split `plugins` phase into attributable substage truth

**Goal:** 让 server 能指出 hang 到底卡在什么 plugin / substage。

**Write-set:**

- `ui/server.mjs`

**What must change:**

1. 把“安装渠道插件与内置能力”拆成最少可归因的 substage。
2. 至少区分：
   - best-effort 内置能力
   - `channels`
   - `wecom-openclaw-plugin`
3. 为当前 requested path 记录：
   - `blockingPlugin`
   - `blockingStep`
   - 当前 bypass 是否 eligible

**Must not do:**

- 不得继续把所有 install 子项糊成一个 `plugins` 黑盒。
- 不得让 hang 只能表现为“还在 running”。

**Done when:**

- plugin hang 可以被精确归因到具体 plugin / stage。

## Phase 2 — Truthful Install Contract

### T033-2 — Define truthful bypass / blocked / fail outcomes

**Goal:** 把 install contract 从“无限 running 或笼统 error”改成 truthful terminal verdict。

**Write-set:**

- `ui/server.mjs`

**Read-set:**

- `ui/public/index.html`（只读，确认当前 terminal consumer 只认 `completed|error`）

**Contract requirements:**

1. full success 只允许在 requested channels authoritative ready 时发生。
2. `blocked_degraded` 允许表达：
   - 某些 best-effort 项已跳过
   - core runtime 可能 usable
   - 但 requested channels 未 ready
3. `failed` 表达 no-bypass 或未修 hang。
4. 默认 outward terminal lane：
   - success → `completed`
   - non-success → `error`
5. requested channel 未 ready 时：
   - terminal verdict 只能是 `blocked_degraded` 或 `failed`
   - outward contract 不能只呈现 `timeout / timed out / health check` 这类文本
   - 不能触发当前 `index.html` 的 success fallback / redirect lane
6. response / install-status 至少可表达：
   - `installState`
   - `blockingPlugin`
   - `blockingStep`
   - requested channel readiness truth
   - bypass verdict

**Must not do:**

- 不得引入 install fake success。
- 不得在 requested channel 未 ready 时返回 `completed`。
- 不得返回任何会被当前 install UI 当成 timeout-like fallback success 候选的 outward non-success shape。

**Done when:**

- install caller 能分辨：
   - truly completed
   - blocked but truthful
   - failed

## Phase 3 — Safe Bypass Path

### T033-3 — Implement safe short-circuit only behind strong authority

**Goal:** 如果 bypass 成立，只短路等待动作，不短路 requested-channel truth gate。

**Write-set:**

- `ui/server.mjs`

**Requirements:**

1. bypass 只能发生在 requested plugin 已被强 authority 证明“与成功安装等价”的情况下。
2. bypass 后仍必须继续：
   - requested channel config
   - runtime start/restart
   - requested channel probe / readback
3. 只有最终 probe / readback 也闭合，install 才能 success。

**Must not do:**

- 不得把 bypass 当成 success 本身。
- 不得在 bypass 后跳过 requested-channel readiness proof。

**Done when:**

- safe bypass 只成为“继续安装”的 gate，而不是“提前宣布成功”的借口。

## Phase 4 — No-Bypass Path

### T033-4 — Turn no-bypass into bounded fail-fast or real fix

**Goal:** 当 bypass 不成立时，install 不能再无限 running。

**Write-set:**

- `ui/server.mjs`

**Requirements:**

1. no-bypass 场景必须在受控预算内结束。
2. 结束方式只能是：
   - bounded fail-fast
   - 或 hang 被真正修复
3. 两条路径都必须输出：
   - `blockingPlugin`
   - `blockingStep`
   - issue summary / root-cause lane

**Must not do:**

- 不得只调大 timeout 继续等。
- 不得把“还没查明”留成 indefinite running。

**Done when:**

- no-bypass 场景下 install 一定会给终态，而不是继续挂在 `plugins`。

## Phase 5 — Requested-Channel Success Gate

### T033-5 — Lock “requested not ready => no success”

**Goal:** 保护 selected `dingtalk + wecom` 不被假成功吞掉。

**Write-set:**

- `ui/server.mjs`
- `ui/tests/packaged-dingtalk-install-gate.test.mjs`
- `ui/tests/packaged-wecom-install-gate.test.mjs`
- `ui/tests/packaged-channel-probe-diagnostics.test.mjs`

**Tests must cover:**

1. requested `dingtalk` plugin 未 ready 时，install 不能 success。
2. requested `wecom` plugin 未 ready 时，install 不能 success。
3. `channelProbes.<requested>.ready` 不会被伪造为 `true`。
4. 跳过 best-effort 项不会自动把 requested channels 变成 ready。
5. requested channel 未 ready 时，source tests 必须锁住：不会触发当前 `index.html` 的 success fallback / redirect lane。

**Done when:**

- selected channels 的 success gate 已被 source tests 明确锁住。

## Phase 6 — Hang/Budget Tests

### T033-6 — Add bounded hang + bypass regression tests

**Goal:** 用 source tests 锁住 plugin hang 不再无限 running。

**Write-set:**

- `ui/tests/packaged-plugin-install-hang-bypass.test.mjs`
- `ui/tests/packaged-install-retry-guards.test.mjs`

**Tests must cover:**

1. `plugins` phase 有显式 budget / verdict。
2. safe bypass 只能在 strong authority 下成立。
3. no-bypass 场景必须 bounded failure。
4. current install UI 仍可通过 `error|completed` terminal lane 感知终态。
5. `blocked_degraded` / `failed` outward contract 不会匹配当前 `index.html` 的 timeout-like success fallback。

**Done when:**

- `step=plugins` indefinite running regression 被 source tests 阻断。

## Phase 7 — Source Validation

### T033-7 — Run fresh source verification

**Goal:** 在 Worker-A 离手前给 Commander fresh source evidence。

**Required commands:**

- `node --check ui/server.mjs`
- `node --test ui/tests/packaged-dingtalk-install-gate.test.mjs`
- `node --test ui/tests/packaged-wecom-install-gate.test.mjs`
- `node --test ui/tests/packaged-install-retry-guards.test.mjs`
- `node --test ui/tests/packaged-channel-probe-diagnostics.test.mjs`
- `node --test ui/tests/packaged-plugin-install-hang-bypass.test.mjs`

**Evidence must show:**

1. bypass predicate 已冻结；
2. no-bypass bounded verdict 已冻结；
3. requested `dingtalk` / `wecom` 未 ready 时不能 success；
4. requested not ready 时不会触发当前 `index.html` 的 success fallback / redirect lane；
5. packet 仍保持 backend-only write-set。

**Done when:**

- Worker-A 只能向 Commander 报告 `fresh source PASS`；
- 不会声称 fresh packaged PASS。

## Phase 8 — Fresh Packaged Verification Handoff

### T033-8 — Handoff to packaged verifier

**Goal:** 把本 packet 正确交给 fresh packaged verifier，而不是自己宣称最终 close。

**Verifier must check:**

1. current real packaged install 不再无限停在 `status:"running" / currentStep:"plugins"`。
2. 对 `dingtalk + wecom` 真实路径，safe bypass 是否成立有明确结论。
3. 若成立，最终 success 仍以 requested channels authoritative ready 为前提。
4. 若不成立，install 会在预算内失败，并指出 plugin / stage / root-cause。
5. package-local `install-state.json` / `install.log` / diagnostics 与 outward contract 保持一致。

**Done when:**

- `F-033` 被送到 `ready for fresh packaged verification`；
- closer / verifier 可以独立判断 real packaged install 是否恢复到 truth-first 状态。

## Hard Stop Rules

出现以下情况必须立即停包并回 Commander：

1. 必须修改 `ui/public/*` 才能让 truthful install terminal contract 被消费。
2. 必须修改 vendor / packaging strategy / wrapper flow 才能继续。
3. 任务开始滑向 Windows、true `F-014`、`F-025-B`、channel contract、或 true `F-027` / `F-031` / `F-032` identity。
4. 任何实现把 requested `dingtalk` / `wecom` 在未 ready 时写成 success。
5. 任何实现把 `opensparrow-router` 或 `opensparrow-router/auto` 改成别的 internal identity。
