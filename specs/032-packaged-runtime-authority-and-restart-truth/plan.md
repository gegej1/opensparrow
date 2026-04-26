# Packaged Runtime Authority and Restart Truth Implementation Plan

> **For agentic workers:** 本计划只允许执行 packaged runtime authority / truthful save contract follow-up。默认 write-set 限定在 `ui/server.mjs` 与 backend/runtime tests；若需要 UI adapter，必须先回 Commander 请求新的 ownership freeze。

**Goal:** 让 packaged runtime 下的 `/api/status` 成为 authoritative truth，并让 `POST /api/config/api` / `POST /api/config/model-routing` 在 restart timeout / health-check timeout 场景下返回 truthful degraded save contract，使 packaged save flow 能在真实语义下闭环。  
**Architecture:** 以 `ui/server.mjs` 为唯一主写面，先收口 runtime authority classification，再把 persistence truth 与 restart truth 从两个 save endpoint 中拆开表达。默认不动 `ui/public/*`；如果现有前端已能消费 `2xx + saved_degraded + followUp` contract，则无需任何 UI 改动。  
**Tech Stack:** Node ESM backend（`ui/server.mjs`）、现有 packaged runtime helper、`node:test` backend/runtime tests、fresh packaged artifact verifier。

---

## 0. Plan Positioning

- 这是 backend/runtime follow-up packet。
- 这不是 Packet A branding/status shell reopen。
- 这不是 Packet B model-routing UI reopen。
- 这不是 Windows packet。
- 这不是 true `F-014`、true `F-027`、或 `F-031` identity rewrite。
- 这不是 native routing packet。

## 1. File Structure / Ownership

### Worker-A 默认允许改动

- `ui/server.mjs`
  - 作用：唯一 authoritative runtime / save contract 主写面。
- `ui/tests/custom-openai-provider-rebind.test.mjs`
  - 作用：继续保护 `/api/config/api` save + runtime restart 契约。
- `ui/tests/packaged-runtime-state-stability.test.mjs`
  - 作用：继续保护 packaged runtime state helper / status read path。
- `ui/tests/packaged-runtime-status-authority.test.mjs`
  - 作用：新增 source-level test，锁定 `/api/status` false-positive authority regression。
- `ui/tests/packaged-save-contract-truth.test.mjs`
  - 作用：新增 source-level test，锁定 persisted-but-restart-degraded save contract。

### Worker-A 只读 authority / context

- `docs/current-status.md`
- `docs/packaged-mac-diagnostics.md`
- `docs/runtime-flow.md`
- `specs/031-dashboard-model-routing-ui/spec.md`
- `specs/031-dashboard-model-routing-ui/plan.md`
- `specs/031-dashboard-model-routing-ui/tasks.md`
- `ui/public/dashboard.html`
- `ui/public/dashboard-model-routing-state.mjs`

### Worker-A 默认禁止改动

- `ui/public/*`
- `ui/lib/model-routing-config.mjs`
- `scripts/model-routing/lib/custom-plugin-routing.mjs`
- `platforms/**`
- `vendor/**`
- `docs/**`
- `longrun/**`
- 任意 Windows 文件

## 2. Relation To Packet A / Packet B

- Packet A 与 Packet B 已 source-level PASS；它们是当前 combined packaged baseline，不是本 packet 的重开目标。
- 本 packet 默认没有与 Packet A / Packet B 共享的 `ui/public/*` write-set，因此在 backend-only 方案下不需要串行等待。
- 只有一种情况会触发串行 / escalation：Worker-A 证明现有 dashboard 无法消费 truthful degraded response，必须触达：
  - `ui/public/dashboard.html`
  - `ui/public/dashboard-model-routing-state.mjs`
- 若出现该情况，不得自行扩 scope；必须停在 backend/runtime packet 边界，回 Commander 申请新的 UI adapter ownership。

## 3. Implementation Order

### Phase 0 — Backend-Only Gate

先确认本 packet 仍能在 backend-only write-set 内完成：

1. `/api/status` false-positive truth 可在 `ui/server.mjs` 内收口；
2. save degraded contract 可在 `ui/server.mjs` 内改成 caller 可消费的 `2xx` truthful response；
3. 现有 dashboard 成功路径能消费 `2xx + warning/warnings`，不必先改 UI。

只要上述 3 条中任一不成立，立即 stop。

### Phase 1 — Runtime Authority Classification

在 `ui/server.mjs` 内先做 runtime truth 收口：

1. 把 same-profile daemon status / health / port truth 放到同一个 authority decision path。
2. 明确 contradictory runtime evidence 的归类规则：
   - 什么时候仍可算 `daemon`
   - 什么时候只能算 `gateway-fallback`
   - 什么时候必须退到 `stopped` / `unknown`
   - 什么时候应标记为 `contradictory`
3. 让 `handleStatus(...)` 不再直接输出 false-positive installed/running truth。
4. 若需要 structured authority evidence（例如 `statusAuthority` / `reasons` / `rpcHealthy`），在这一阶段一起固定。

这一阶段的目标不是“增加更多状态字段”，而是保证顶层 truth 先不说谎，再让 verifier 有证据可读。

### Phase 2 — Truthful Save Outcome Contract

接着在 `ui/server.mjs` 中收口两个 save endpoint 的 runtime restart 语义：

1. 把 persistence truth 与 restart truth 显式拆开。
2. 对 `/api/config/api` 定义三类 outcome：
   - `saved`
   - `saved_degraded`
   - `rejected`
3. 对 `/api/config/model-routing` 也定义同一组 outcome，但保留既有 routing-specific response fields。
4. 当 persistence 已成功、但 restart timeout / health timeout 时：
   - response 改走 `2xx`
   - `ok` 仍为 `true`
   - 暴露 `saveState = saved_degraded`
   - 暴露 `persisted = true`
   - 暴露 `restart` structured summary
   - 暴露 authoritative `followUp` endpoints
5. 只有 persistence 自身失败、或 response 无法定义 truthful recovery path 时，才继续走 `rejected` / non-2xx。

这一阶段的重点不是把 timeout 假装成功，而是把“已写盘但 runtime 恢复不完整”定义成真实、可恢复、可验证的 degraded state。

### Phase 3 — Source Test Closure

完成 contract 改动后，补齐 backend/runtime tests：

1. 新增 `/api/status` authority truth regression tests。
2. 新增 persisted-but-restart-degraded save contract tests。
3. 扩充现有 `custom-openai-provider-rebind` coverage，确保 `/api/config/api` 不再把 persisted write 统一吞成 generic failure。
4. 扩充现有 packaged runtime stability tests，确保 status helper 的 authority path 不会回退。

tests 必须保护两类 negative invariant：

- no false-positive running status
- no persisted-write generic failure

同时继续保护：

- `opensparrow-router`
- `opensparrow-router/auto`

### Phase 4 — Verification Handoff

Worker-A source-level 完成后，只能给出：

- fresh source PASS
- ready for fresh packaged artifact verification

不得直接宣称 combined packaged PASS。最终 verifier 仍需在 fresh artifact 中重放：

1. `/api/status` 与 same-profile runtime evidence 的一致性；
2. `/api/config/api` degraded save truth；
3. `/api/config/model-routing` degraded save truth；
4. follow-up GET / reopen 是否真能回到 persisted state。

## 4. Why This Can Stay Backend-Only By Default

当前 packaged frontend 的关键行为是：

- `saveApiConfig()` 只要拿到 `2xx` 就会走 success lane，并显示 `warnings`；
- `dashboard-model-routing-state.save()` 只要拿到 `2xx + ok:true`，就会继续做 authoritative read-after-write，并显示 `warning`。

因此，只要 backend contract 被收口为：

- `saved` / `saved_degraded` 都走 `2xx`
- API config 侧提供 `warnings`
- model-routing 侧提供 `warning`
- 两边都有 authoritative `followUp`

理论上 packaged save flow 就可以在不改 UI 的情况下先闭环。

只有当 fresh verifier 证明“现有 UI 仍无法消费 truthful degraded response”时，才有理由另开最小 UI adapter packet。

## 5. Verification Plan

### Source-level verification

必须至少执行：

- `node --check ui/server.mjs`
- `node --test ui/tests/custom-openai-provider-rebind.test.mjs`
- `node --test ui/tests/packaged-runtime-state-stability.test.mjs`
- `node --test ui/tests/packaged-runtime-status-authority.test.mjs`
- `node --test ui/tests/packaged-save-contract-truth.test.mjs`

### Fresh packaged verification handoff

Worker-A 必须把 verifier 要检查的 packaged evidence 写清楚：

1. `/api/status` 不再在 same-profile `health=false` / `rpc=false` / port free 条件下冒充 `installed:true + daemon:"running" + runtimeMode:"daemon"`。
2. `POST /api/config/api` 在 persisted-but-restart-degraded 场景下返回 truthful `2xx` degraded contract。
3. `POST /api/config/model-routing` 在同类场景下也返回 truthful `2xx` degraded contract。
4. follow-up `GET /api/status` + 对应 config `GET` / reopen 能读回 persisted state。
5. Packet A / Packet B 已通过的 GTClaw shell / model-routing UI surface 不发生回退。

## 6. Stop Conditions

任一阶段出现以下情况，Worker-A 必须停止并回 Commander：

1. 需要改 `ui/public/*` 才能让 truthful degraded response 被消费。
2. 需要改 `ui/lib/model-routing-config.mjs` 或 `scripts/model-routing/lib/custom-plugin-routing.mjs` 才能继续。
3. 需要改 vendor / packaging strategy / wrapper flow 才能让 `/api/status` truthful。
4. 需求开始滑向 Windows、true `F-014`、channel contract、或 true `F-027` / `F-031` identity。
5. 有人试图借本 packet 改 `opensparrow-router` 或 `opensparrow-router/auto`。
