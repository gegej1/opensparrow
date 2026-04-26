# Packaged Plugin Install Hang and Bypass Implementation Plan

> **For agentic workers:** 本计划只允许执行 packaged install plugin-hang follow-up。默认 write-set 限定在 `ui/server.mjs` 与 backend/runtime tests；若需要 install UI adapter，必须先回 Commander 请求新的 ownership freeze。

**Goal:** 让 packaged real install 在 `step=plugins` 卡滞时先回答“是否存在 safe bypass”，并在 bypass 不成立时转为 bounded fail-fast 或 root-cause fix；整个过程都不允许把未 authoritative ready 的 requested `dingtalk` / `wecom` 写成安装成功。  
**Architecture:** 以 `ui/server.mjs` 为唯一主写面，先把 plugin phase 拆成可判定的 substage / plugin ownership，再定义 `safe_bypass`、`blocked_degraded`、`failed` 的 truthful contract。默认不动 `ui/public/*`，并优先复用现有 install UI 只识别 `completed|error` 的 terminal lane。  
**Tech Stack:** Node ESM backend（`ui/server.mjs`）、install tracker / package-local diagnostics、`node:test` backend/runtime tests、fresh packaged artifact verifier。

---

## 0. Plan Positioning

- 这是 backend/runtime install packet。
- 这不是 Packet A / Packet B reopen。
- 这不是 `F-032` reopen。
- 这不是 Windows packet。
- 这不是 true `F-014`、true `F-027`、`F-031`、或 `F-032` identity rewrite。

## 1. File Structure / Ownership

### Worker-A 默认允许改动

- `ui/server.mjs`
  - 作用：唯一 authoritative install / plugin-phase contract 主写面。
- `ui/tests/packaged-dingtalk-install-gate.test.mjs`
  - 作用：继续保护 requested dingtalk plugin gate。
- `ui/tests/packaged-wecom-install-gate.test.mjs`
  - 作用：继续保护 requested wecom plugin gate。
- `ui/tests/packaged-install-retry-guards.test.mjs`
  - 作用：继续保护 install terminal-state truth 与 timeout guards。
- `ui/tests/packaged-channel-probe-diagnostics.test.mjs`
  - 作用：保护 probe/readback persistence truth。
- `ui/tests/packaged-plugin-install-hang-bypass.test.mjs`
  - 作用：新增 source-level test，锁定 bypass matrix 与 bounded plugin verdict。

### Worker-A 只读 authority / context

- `docs/current-status.md`
- `docs/packaged-mac-diagnostics.md`
- `docs/runtime-flow.md`
- `specs/031-dashboard-model-routing-ui/spec.md`
- `specs/032-packaged-runtime-authority-and-restart-truth/spec.md`
- `ui/public/index.html`

### Worker-A 默认禁止改动

- `ui/public/*`
- `ui/lib/model-routing-config.mjs`
- `scripts/model-routing/lib/custom-plugin-routing.mjs`
- `platforms/**`
- `vendor/**`
- `docs/**`
- `longrun/**`
- 任意 Windows 文件

## 2. Relation To F-031 / F-032

- `F-031` 已锁定 dashboard routing UI surface；本 packet 不触达 dashboard。
- `F-032` 已锁定 `/api/status` 与 save truthful contract；本 packet 只把相同的“truthful contract first”原则延伸到 install/plugin hang。
- 在 backend-only 方案下，本 packet 与 `F-031` / `F-032` 没有 shared `ui/public/*` write-set，因此不需要串行等待其他 worker。
- 只有一种情况会触发 escalation：Worker-A 证明必须新增 install 页面第三种 terminal UX，现有 `index.html` 无法 truthful 消费。出现该情况时必须停包回 Commander。

## 3. Implementation Order

### Phase 0 — Decide Bypass Authority First

先按业务优先级处理：

1. **先判 bypass**
   - 不是先修 hang
   - 也不是先调大 timeout
   - 当前 `dingtalk + wecom` live 起点固定为：**暂无已证明的 safe bypass**
2. 先建立 requested-plugin bypass predicate：
   - 什么证据才算 `channels` 已与成功安装等价
   - 什么证据才算 `wecom-openclaw-plugin` 已与成功安装等价
3. 明确排除弱迹象：
   - bundled tgz presence
   - 目录存在
   - 文件数稳定
   - CPU 很低
   - 日志停住

只有在 bypass predicate 先被冻清后，后续“短路”才不会越界成 fake success。

### Phase 1 — Split Plugin Phase Into Authoritative Substages

在 `ui/server.mjs` 内把当前 `plugins` 大步骤拆成最少可归因的 install truth：

1. bundled prerequisites / best-effort items
2. requested plugin `channels`
3. requested plugin `wecom-openclaw-plugin`
4. install child result / stall budget verdict

这一阶段的目标不是重做整个 install flow，而是确保 hang 一旦发生，server 能准确说出：

- 卡在什么 plugin
- 卡在什么 substage
- 当前能否 safe bypass

### Phase 2 — Truthful Bypass / Blocked / Fail Contract

接着在 `ui/server.mjs` 中定义 install terminal contract：

1. **full success**
   - requested channels authoritative ready
   - install `status = completed`
2. **blocked_degraded**
   - base runtime 可能 usable
   - 某些 best-effort 项可能已跳过
   - 但 requested `dingtalk` / `wecom` 未 ready
   - install 仍走 terminal non-success lane
   - outward shape 不能落入当前 install UI 的 timeout-like success fallback
3. **failed**
   - bypass 不成立
   - 或 hang root-cause 未修
   - install 在预算内失败

默认要求：

- 仍复用现有 UI 可消费的 `completed | error` terminal lane；
- 结构化细节放在 response / install-status fields，而不是先改 UI。
- requested channel 未 ready 时，terminal verdict 只能是 `blocked_degraded` 或 `failed`，不得返回 `completed`。
- `blocked_degraded` / `failed` 不得只暴露“timeout / timed out / health check”这类 outward 文本；否则当前 `index.html` 会把 non-success 错误送进 `waitUntilInstalled()` / redirect lane，破坏 truth-first contract。

### Phase 3 — Safe Bypass Only When It Still Leads To Truthful Success

如果 implementation 证明某个 requested plugin 可 safe short-circuit：

1. short-circuit 的只是“继续等 child 退出”；
2. 后续仍要继续：
   - requested channel config
   - runtime start
   - channel probe / readback
3. 只有当最终 requested channels 真正 ready 时，install 才能 success。

如果 short-circuit 后最终 requested channels 仍未 ready：

- install 不能被记为 success；
- 只能进入 `blocked_degraded` 或 `failed`。

### Phase 4 — No-Bypass Path Must Become Bounded Fail-Fast Or Real Fix

如果 bypass predicate 不成立：

1. 不再允许继续 indefinite running；
2. implementation 必须二选一：
   - bounded fail-fast
   - root-cause fix
3. 两条路都要留下相同的 truthful outward contract：
   - `blockingPlugin`
   - `blockingStep`
   - root-cause / issue summary
   - requested channel readiness truth

### Phase 5 — Source Test Closure

完成 contract 改动后，补齐 backend/runtime tests：

1. 锁 safe bypass 只能建立在 strong authority 上；
2. 锁 requested channel 未 ready 时 install 不能 success；
3. 锁 no-bypass 场景必须 bounded failure；
4. 锁 `channelProbes` / diagnostics truth 继续可回读。

### Phase 6 — Verification Handoff

Worker-A source-level 完成后，只能给出：

- fresh source PASS
- ready for fresh packaged artifact verification

不得直接宣称 packaged PASS。最终 verifier 仍需在 fresh artifact 上重放：

1. `dingtalk + wecom` real install；
2. safe bypass 是否成立；
3. no-bypass 时是否 bounded failure；
4. 若 fix 成功，是否重新完成 real install。

## 4. Why Backend-Only Is Still Viable By Default

当前 install UI 的关键限制是：

- success lane：`res.ok`
- non-success lane：`!res.ok`
- terminal state：只认 `error / completed / done`
- timeout-like fallback：若错误文本只表现为 `timeout / health check` 且不含硬失败信号，当前 consumer 会进入 `waitUntilInstalled()` 并可能走 success redirect

因此，backend-only 仍然可行的前提是：

1. 真 success 仍走 `completed`；
2. `blocked_degraded` / `failed` 仍走 `error`；
3. 精确 plugin/stage/root-cause 必须通过现有 `buildInstallErrorText(...)` 可见字段下发，且 outward 文本不能退化成 timeout-like success fallback 形状；
4. 不强行引入 install 页面第三种 terminal UX。

只有当 Commander 想要“core runtime usable but requested channels blocked”的专门可视化分流时，才需要 UI adapter packet。

## 5. Verification Plan

### Source-level verification

必须至少执行：

- `node --check ui/server.mjs`
- `node --test ui/tests/packaged-dingtalk-install-gate.test.mjs`
- `node --test ui/tests/packaged-wecom-install-gate.test.mjs`
- `node --test ui/tests/packaged-install-retry-guards.test.mjs`
- `node --test ui/tests/packaged-channel-probe-diagnostics.test.mjs`
- `node --test ui/tests/packaged-plugin-install-hang-bypass.test.mjs`

### Fresh packaged verification handoff

Worker-A 必须把 verifier 要检查的 packaged evidence 写清楚：

1. `step=plugins` 不再无限 running。
2. 对当前 `dingtalk + wecom` 路径，safe bypass 是否成立有明确 verdict。
3. 若成立，最终 success 仍要求 requested channels authoritative ready。
4. 若不成立，install 只允许落到 `blocked_degraded` 或 `failed` 的 non-success lane，且不会触发当前 install UI 的 timeout-like success fallback / redirect。
5. 若不成立，install 会在预算内失败或受控阻断，并指出 plugin / stage / root-cause。
6. `channelProbes` 与 package-local diagnostics 不会把未 ready 的 requested channels 伪装成 ready。

## 6. Stop Conditions

任一阶段出现以下情况，Worker-A 必须停止并回 Commander：

1. 需要改 `ui/public/*` 才能 truthful 表达 install terminal contract。
2. 需要改 vendor / packaging strategy / wrapper flow 才能处理 plugin hang。
3. 需求开始滑向 Windows、true `F-014`、`F-025-B`、channel contract、或 true `F-027` / `F-031` / `F-032` identity。
4. 有人试图让 requested `dingtalk` / `wecom` 在未 ready 时也返回 success。
5. 有人试图借本 packet 改 `opensparrow-router` 或 `opensparrow-router/auto`。
