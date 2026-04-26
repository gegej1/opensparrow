# Tasks: Dashboard Model-Routing UI Surface

**Feature ID**: `F-031`  
**Packet identity**: `Packet B = dashboard model-routing UI surface follow-up`  
**Dispatch rule**: 只在 Packet A 释放 `dashboard.html` 写面后开工；只改 UI surface 与 tests；不得改 backend contract。

## Global Guards

- 这是 Packet B follow-up，不是 true `F-027` identity rewrite。
- `GET /api/config/model-routing` / `POST /api/config/model-routing` 是唯一 authoritative routing surface。
- `POST /api/config/api` 仍只是 upstream connection / compatibility lane。
- internal provider id 必须保持 `opensparrow-router`。
- internal target 必须保持 `opensparrow-router/auto`。
- 不得把 custom plugin routing 偷换成 native routing。
- 不得修改 Windows、`F-025-B`、true `F-014`、channel contract、vendor、packaged runtime。
- source-level完成后仍需 combined packaged verification，Worker-B 不得自行宣布最终 close。

## Ownership Freeze

### Worker-B 允许改动

- `ui/public/dashboard.html`
- `ui/public/dashboard-model-routing-state.mjs`
- `ui/public/replay-surfaces.test.mjs`
- `ui/tests/dashboard-model-routing-ui.test.mjs`

### Worker-B 只读

- `ui/server.mjs`
- `ui/lib/model-routing-config.mjs`
- `scripts/model-routing/lib/custom-plugin-routing.mjs`
- `ui/tests/dashboard-status-shell.test.mjs`
- `docs/current-status.md`
- `docs/runtime-flow.md`

### Worker-B 禁止改动

- `ui/server.mjs`
- `ui/lib/model-routing-config.mjs`
- `scripts/model-routing/lib/custom-plugin-routing.mjs`
- `vendor/**`
- `platforms/**`
- `docs/**`
- `longrun/**`
- 任意 Windows 文件

## Phase 0 — Serialization Gate

### T031-0 — Wait for Packet A write-set release

**Goal:** 在真正动手前确认 shared write-set 已从 Packet A 释放。

**Must verify before any edit:**

1. Commander 已明确允许 Worker-B 接手：
   - `ui/public/dashboard.html`
   - `ui/public/replay-surfaces.test.mjs`
2. Packet A 当前 source-level changes 已稳定，不再继续改动 dashboard shell/status truth。

**Blocked when:**

- Packet A 仍在写 `dashboard.html`；
- Packet A 仍在写 `replay-surfaces.test.mjs`；
- Commander 尚未释放写面。

## Phase 1 — Routing State Module

### T031-1 — Create `ui/public/dashboard-model-routing-state.mjs`

**Goal:** 新增一个只面向 dashboard routing surface 的前端 state module。

**Write-set:**

- `ui/public/dashboard-model-routing-state.mjs`

**Read-set:**

- `ui/server.mjs`
- `ui/lib/model-routing-config.mjs`
- `scripts/model-routing/lib/custom-plugin-routing.mjs`
- `docs/runtime-flow.md`

**Module responsibilities:**

1. 读取 `GET /api/config/model-routing`。
2. 提交 `POST /api/config/model-routing`。
3. 在 save 成功后再次读取 authoritative read-back。
4. 管理 single / smart mode draft state。
5. 暴露 invariant metadata：
   - `providerId = opensparrow-router`
   - `modelTarget = opensparrow-router/auto`
6. 暴露 compatibility-lane copy，提醒 UI：
   - `API 配置` 不是 routing truth。

**Must not do:**

- 不得修改 endpoint shape；
- 不得自行推导新的 provider id / target；
- 不得把 native provider 列表引入为 routing truth。

**Done when:**

- dashboard host 已有一个可复用的 routing state layer；
- state layer 明确以 current endpoints 为 authority；
- invariant guard 在 module 层已冻结。

**Stop rule:**

- 若发现必须改 backend contract 才能继续，立即停并回 Commander。

## Phase 2 — Dashboard Host Surface

### T031-2 — Integrate dedicated routing surface into `ui/public/dashboard.html`

**Goal:** 在 dashboard 中接入独立的 model-routing UI surface。

**Write-set:**

- `ui/public/dashboard.html`

**Read-set:**

- `ui/public/dashboard-model-routing-state.mjs`
- `ui/tests/dashboard-status-shell.test.mjs`
- `docs/current-status.md`
- `docs/runtime-flow.md`

**UI requirements:**

1. 用户能清楚区分：
   - `模型智能路由`
   - `API 配置`
2. routing surface 的 load/save 全部交给 `dashboard-model-routing-state.mjs`。
3. save 后必须用 authoritative read-back 刷新 UI。
4. `API 配置` 区域保留，但文案上只能是：
   - upstream connection
   - compatibility lane
5. UI 中不得出现：
   - 可编辑 provider id
   - 可编辑 smart target
   - “native provider 选择器就是 routing truth” 的语义

**Regression guard:**

- 不得回退 Packet A 的：
  - GTClaw branding
  - authoritative status truth
  - non-fake version display

**Done when:**

- dashboard 上已有明确可见的 routing UI surface；
- `API 配置` 与 routing truth 已被分开；
- shell/status truth 未被回退。

## Phase 3 — Source Tests

### T031-3 — Add dedicated routing UI source tests

**Goal:** 用 source tests 锁住 UI surface、invariants、以及 read-after-write contract。

**Write-set:**

- `ui/tests/dashboard-model-routing-ui.test.mjs`
- `ui/public/replay-surfaces.test.mjs`

**Read-set:**

- `ui/public/dashboard.html`
- `ui/public/dashboard-model-routing-state.mjs`
- `ui/server.mjs`
- `ui/tests/dashboard-status-shell.test.mjs`

**Tests must cover:**

1. dashboard 存在独立的 model-routing UI surface。
2. routing load 调用 `GET /api/config/model-routing`。
3. routing save 调用 `POST /api/config/model-routing`。
4. save 后会再次读取 authoritative read-back，而不是本地假回放。
5. `API 配置` 区域仍是 compatibility lane，不是 routing truth。
6. source tests 能证明：
   - `opensparrow-router` 没变
   - `opensparrow-router/auto` 没变
   - UI 没有被改造成 native routing

**Done when:**

- 新增 tests 能在 source 层直接阻断 contract drift；
- Packet A 的 shell/status tests 仍可作为回归基线继续通过。

### T031-4 — Run source validation

**Goal:** 在 Worker-B 离手前给出 fresh source evidence。

**Required commands:**

- `node --check ui/public/dashboard-model-routing-state.mjs`
- `node --test ui/tests/dashboard-model-routing-ui.test.mjs`
- `node --test ui/public/replay-surfaces.test.mjs`
- `node --test ui/tests/dashboard-status-shell.test.mjs`

**Evidence must show:**

1. routing UI source tests 通过；
2. Packet A 的 dashboard shell/status 回归未被打坏；
3. invariant drift 未发生。

**Done when:**

- Worker-B 可以向 Commander 交付 `fresh source PASS`；
- 但不会声称 packaged closeout 已完成。

## Phase 4 — Combined Packaged Verification Handoff

### T031-5 — Handoff to combined verifier

**Goal:** 把 Packet B 交给 combined packaged verification，而不是自己宣称 close。

**Worker-B must hand off these packaged checks:**

1. fresh packaged artifact 中的 dashboard 存在独立 model-routing UI surface；
2. packaged routing load/save 仍走 `GET/POST /api/config/model-routing`；
3. packaged save 后刷新页面，UI 仍以 authoritative read-back 为准；
4. packaged `API 配置` 页仍只是 compatibility lane；
5. packaged artifact 中没有 `opensparrow-router` / `opensparrow-router/auto` drift；
6. packaged dashboard 仍保留 Packet A 的 branded shell 与 status truth。

**Done when:**

- Worker-B 只把 Packet B 送到 `ready for combined packaged verification`；
- 不宣称 final PASS；
- 不修改 docs / longrun。

## Hard Stop Rules

出现以下情况必须立即停包并回 Commander：

1. 必须修改 `ui/server.mjs` 才能继续。
2. 必须修改 `ui/lib/model-routing-config.mjs` 或 `scripts/model-routing/lib/custom-plugin-routing.mjs` 才能继续。
3. Packet A 仍持有 `dashboard.html` 或 `replay-surfaces.test.mjs` 写面。
4. 任务开始滑向 Windows、true `F-014`、channel contract、vendor、packaged runtime。
5. 任何实现把 routing 重新定义成 native provider UI。
