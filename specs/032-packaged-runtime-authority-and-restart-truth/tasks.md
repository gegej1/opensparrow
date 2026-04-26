# Tasks: Packaged Runtime Authority and Restart Truth

**Feature ID**: `F-032`  
**Packet identity**: `packaged runtime authority + truthful restart contract follow-up`  
**Dispatch rule**: 默认只改 `ui/server.mjs` 与 backend/runtime tests；若需要触达 `ui/public/*` 才能闭环，立即停包回 Commander。

## Global Guards

- 这是 backend/runtime follow-up packet，不是 Packet A shell reopen，也不是 Packet B UI reopen。
- `/api/status` 必须成为 same-profile authoritative runtime truth。
- `POST /api/config/api` 与 `POST /api/config/model-routing` 必须区分 persistence truth 与 restart truth。
- persistence 已成功时，不允许继续返回 generic failure 且无恢复路径。
- internal provider id 必须保持 `opensparrow-router`。
- internal target 必须保持 `opensparrow-router/auto`。
- 不得把 custom plugin routing 偷换成 native routing。
- 不得修改 Windows、`F-025-B`、true `F-014`、true `F-027` / `F-031` identity、channel contract、vendor、packaging strategy。
- source-level 完成后仍需 fresh packaged artifact verification，Worker-A 不得自行宣布最终 close。

## Ownership Freeze

### Worker-A 允许改动

- `ui/server.mjs`
- `ui/tests/custom-openai-provider-rebind.test.mjs`
- `ui/tests/packaged-runtime-state-stability.test.mjs`
- `ui/tests/packaged-runtime-status-authority.test.mjs`
- `ui/tests/packaged-save-contract-truth.test.mjs`

### Worker-A 只读

- `docs/current-status.md`
- `docs/packaged-mac-diagnostics.md`
- `docs/runtime-flow.md`
- `specs/031-dashboard-model-routing-ui/spec.md`
- `specs/031-dashboard-model-routing-ui/plan.md`
- `specs/031-dashboard-model-routing-ui/tasks.md`
- `ui/public/dashboard.html`
- `ui/public/dashboard-model-routing-state.mjs`

### Worker-A 禁止改动

- `ui/public/*`
- `ui/lib/model-routing-config.mjs`
- `scripts/model-routing/lib/custom-plugin-routing.mjs`
- `platforms/**`
- `vendor/**`
- `docs/**`
- `longrun/**`
- 任意 Windows 文件

## Phase 0 — Backend-Only Gate

### T032-0 — Confirm this packet stays out of UI write-set

**Goal:** 在真正动手前确认 combined packaged blocker 仍可在 backend/runtime 面内收口。

**Must verify before any code edit:**

1. `/api/status` false-positive truth 可通过 `ui/server.mjs` authority decision path 修复。
2. persisted-but-restart-degraded save contract 可通过 backend response shape 改成 caller 可消费的 `2xx` truthful result。
3. 当前 dashboard success lane 已能消费：
   - API config 的 `warnings`
   - model-routing 的 `warning`

**Blocked when:**

- 需要先改 `ui/public/dashboard.html`；
- 需要先改 `ui/public/dashboard-model-routing-state.mjs`；
- 需要另开 UI packet 才能继续。

## Phase 1 — `/api/status` Authority Truth

### T032-1 — Harden runtime authority classification in `ui/server.mjs`

**Goal:** 让 `/api/status` 只输出 same-profile authoritative truth。

**Write-set:**

- `ui/server.mjs`

**What must change:**

1. 把 daemon status、health truth、rpc truth、port truth 拉到同一条 authority path。
2. 为 contradictory runtime evidence 设定明确归类：
   - `authoritative`
   - `contradictory`
   - `unknown`
   - 或 implementation 选定的等价命名
3. 当 same-profile evidence 已经表明：
   - `health=false`
   - `rpc=false`
   - port free / no current runtime listener
   时，顶层 response 不得继续是：
   - `installed:true`
   - `daemon:"running"`
   - `runtimeMode:"daemon"`
4. 若需要新增 structured authority evidence（例如 `statusAuthority`、`reasons`、`rpcHealthy`），必须在 source tests 中一起冻结。

**Must not do:**

- 不得只改文案，不改 authority truth。
- 不得把 contradictory state 继续包装成 success。
- 不得顺手改 Packet A dashboard shell。

**Done when:**

- `/api/status` 顶层 truth 不再对 contradictory runtime evidence 说谎；
- verifier 能从 response 中读到 why / how it is degraded。

## Phase 2 — Truthful Save Contract

### T032-2 — Fix `/api/config/api` degraded save semantics

**Goal:** 把 `/api/config/api` 从“persisted write + generic failure”改成 truthful save contract。

**Write-set:**

- `ui/server.mjs`

**Read-set:**

- `ui/tests/custom-openai-provider-rebind.test.mjs`
- `ui/public/dashboard.html`（只读，确认当前 caller 对 `2xx` 与 `warnings` 的消费方式）

**Contract requirements:**

1. persistence failure 时，仍可返回 `rejected` / non-2xx。
2. persistence succeeded 且 restart succeeded 时，返回 `saved`。
3. persistence succeeded 但 restart timeout / health timeout 时，返回：
   - `2xx`
   - `ok: true`
   - `saveState: "saved_degraded"`
   - `persisted: true`
   - `warnings`
   - `restart` structured summary
   - `followUp.statusEndpoint = /api/status`
   - `followUp.configEndpoint = /api/config/api`

**Must not do:**

- 不得在 persistence 已成功时继续给 500 generic failure。
- 不得省略 authoritative follow-up endpoint。

**Done when:**

- API save caller 能区分“没写进去”与“写进去了但 runtime 恢复不完整”。

### T032-3 — Fix `/api/config/model-routing` degraded save semantics

**Goal:** 把 `/api/config/model-routing` 从“persisted write + generic failure”改成 truthful save contract，同时保持 routing invariant 不漂移。

**Write-set:**

- `ui/server.mjs`

**Read-set:**

- `ui/public/dashboard-model-routing-state.mjs`（只读，确认 caller 对 `2xx + ok:true + warning` 的消费方式）
- `ui/lib/model-routing-config.mjs`
- `scripts/model-routing/lib/custom-plugin-routing.mjs`

**Contract requirements:**

1. persistence failure 时，仍可返回 `rejected` / non-2xx。
2. persistence succeeded 且 restart succeeded 时，返回 `saved`。
3. persistence succeeded 但 restart timeout / health timeout 时，返回：
   - `2xx`
   - `ok: true`
   - `saveState: "saved_degraded"`
   - `persisted: true`
   - `warning`
   - `restart` structured summary
   - `followUp.statusEndpoint = /api/status`
   - `followUp.configEndpoint = /api/config/model-routing`
4. 仍保留 routing-specific truth：
   - `mode`
   - `effectivePrimaryModel`
   - `message`
5. 不得改：
   - `opensparrow-router`
   - `opensparrow-router/auto`

**Must not do:**

- 不得把 degraded save 包装成 hard failure。
- 不得借机修改 model-routing backend contract identity。
- 不得触达 `ui/lib/model-routing-config.mjs` 或 router sidecar 代码。

**Done when:**

- model-routing save caller 能拿到 truthful degraded contract；
- routing invariants 仍受保护。

## Phase 3 — Backend/Runtime Tests

### T032-4 — Add `/api/status` authority regression tests

**Goal:** 用 source tests 锁住 false-positive status regression。

**Write-set:**

- `ui/tests/packaged-runtime-status-authority.test.mjs`
- `ui/tests/packaged-runtime-state-stability.test.mjs`

**Tests must cover:**

1. same-profile `health=false` / `rpc=false` / port free / no current runtime listener 时，`/api/status` 不得继续输出 false-positive running truth。
2. contradictory runtime evidence 会进入明确的 degraded / contradictory lane。
3. source 中固定了最终 authority field shape。

**Done when:**

- 再次出现 false-positive status 时，source tests 会直接失败。

### T032-5 — Add truthful save contract regression tests

**Goal:** 用 source tests 锁住 persisted-but-restart-degraded save semantics。

**Write-set:**

- `ui/tests/packaged-save-contract-truth.test.mjs`
- `ui/tests/custom-openai-provider-rebind.test.mjs`

**Tests must cover:**

1. `/api/config/api` 在 persisted success + restart degraded 时返回 `2xx + ok:true + saveState:"saved_degraded"`。
2. `/api/config/model-routing` 在同类场景下也返回 truthful degraded contract。
3. 两个 endpoint 都提供 authoritative `followUp` endpoints。
4. generic `daemon restart failed` 不再是 persistence succeeded 场景下的唯一 outward truth。
5. model-routing response 仍保护：
   - `opensparrow-router`
   - `opensparrow-router/auto`

**Done when:**

- persisted-write generic failure regression 被 source tests 明确阻断。

## Phase 4 — Source Validation

### T032-6 — Run fresh source verification

**Goal:** 在 Worker-A 离手前给 Commander fresh source evidence。

**Required commands:**

- `node --check ui/server.mjs`
- `node --test ui/tests/custom-openai-provider-rebind.test.mjs`
- `node --test ui/tests/packaged-runtime-state-stability.test.mjs`
- `node --test ui/tests/packaged-runtime-status-authority.test.mjs`
- `node --test ui/tests/packaged-save-contract-truth.test.mjs`

**Evidence must show:**

1. `/api/status` authority truth 已收口；
2. save degraded contract 已 truthful；
3. `opensparrow-router` / `opensparrow-router/auto` 未漂移；
4. packet 仍保持 backend-only write-set。

**Done when:**

- Worker-A 只能向 Commander 报告 `fresh source PASS`；
- 不会声称 combined packaged PASS。

## Phase 5 — Fresh Packaged Verification Handoff

### T032-7 — Handoff to packaged verifier

**Goal:** 把本 packet 正确交给 fresh packaged verifier，而不是自己宣称最终 close。

**Verifier must check:**

1. fresh packaged artifact 中，`GET /api/status` 不再在 same-profile `health=false` / `rpc=false` / port free 条件下给出 false-positive running truth。
2. `POST /api/config/api` 在 persisted-but-restart-degraded 场景下，response 给出 truthful degraded contract。
3. `POST /api/config/model-routing` 在同类场景下，response 也给出 truthful degraded contract。
4. 按 response 指示的 `followUp` 去做 `GET` / reopen，能回到 persisted state。
5. Packet A / Packet B 已通过的 GTClaw branding、dashboard shell、model-routing UI surface 未被本 packet 打坏。

**Done when:**

- F-032 被送到 `ready for fresh packaged verification`；
- closer / verifier 可以独立判断 combined packaged 是否恢复 PASS。

## Hard Stop Rules

出现以下情况必须立即停包并回 Commander：

1. 必须修改 `ui/public/*` 才能继续。
2. 必须修改 `ui/lib/model-routing-config.mjs` 或 `scripts/model-routing/lib/custom-plugin-routing.mjs` 才能继续。
3. 必须修改 vendor / packaging strategy / wrapper flow 才能修 truth。
4. 任务开始滑向 Windows、true `F-014`、channel contract、或 true `F-027` / `F-031` identity。
5. 任何实现把 `opensparrow-router` 或 `opensparrow-router/auto` 改成别的 internal identity。
