# Feature Specification: Packaged Runtime Authority and Restart Truth

**Feature ID**: `F-032`  
**Feature Branch**: `032-packaged-runtime-authority-and-restart-truth`  
**Created**: `2026-04-23`  
**Status**: `Completed (source truth PASS + combined packaged PASS, 2026-04-23)`  
**Input**: Commander 已冻结 fresh verifier truth：`Packet A` source-level PASS、`Packet B` source-level PASS，但 combined packaged verification 仍被两个 backend/runtime truth blocker 卡住：`/api/status` authority drift，以及 `POST /api/config/api` / `POST /api/config/model-routing` 在 restart timeout / health-check timeout 场景下的 save contract 不 truthful。

## Closeout Evidence (`2026-04-23`)

- `F-032 source truth PASS`
- fresh combined packaged verification 已确认：
  - authoritative `/api/status` truth PASS
  - truthful save contract PASS
  - `POST /api/config/api` 实测返回 `HTTP 200`, `ok:true`, `persisted:true`, `saveState:"saved_degraded"`
  - `POST /api/config/model-routing` 实测返回 `HTTP 200`, `ok:true`, `persisted:true`, `saveState:"saved_degraded"`
  - follow-up `GET` / reopen 读回 persisted truth PASS
  - internal ids unchanged PASS：
    - `opensparrow-router`
    - `opensparrow-router/auto`
  - combined packaged truth PASS
- truthful save contract 现允许：
  - `saved`
  - `saved_degraded`
  - `rejected`

## 一句话定义

`F-032 = 只为 packaged runtime 收口 /api/status authority truth 与 config save restart-timeout truthful contract 的 backend/runtime follow-up packet；它修正 combined packaged verification 的真实 blocker，但不重开 Packet A branding/status shell，不重开 Packet B model-routing UI，也不重写 true F-014 / F-027 / F-031 identity。`

## Follow-up Freeze

- 本 packet 只处理 fresh packaged verifier 已确认的两个 blocker：
  - packaged `/api/status` authority truth 不够 authoritative；
  - `POST /api/config/api` 与 `POST /api/config/model-routing` 在“写盘成功但 restart/health timeout”场景下对前端返回 generic failure，导致 save flow 无法闭环。
- 本 packet 是 backend/runtime follow-up，不是 Packet A 的 shell/status card 重开。
- 本 packet 不是 Packet B 的 dashboard model-routing UI surface 重开。
- 本 packet 不 rewrite true `F-014`、true `F-027`、或 `F-031` 的 feature identity；它只消费既有边界。
- internal invariant 必须保持：
  - provider id = `opensparrow-router`
  - target = `opensparrow-router/auto`
- 默认 write-set 只允许 backend/runtime 面：`ui/server.mjs` + backend/runtime tests。
- `ui/public/*` 默认不在本 packet 写面内；只有在证明“现有前端无法消费 truthful degraded response”时，才允许回 Commander 请求单独 UI adapter freeze。
- 本 packet 不得顺手扩到 Windows、`F-025-B`、channel contract、vendor、packaging strategy、或 native routing。

## Authority / Truth Source

本 feature 的 authority 顺序固定为：

1. 用户本轮冻结事实与禁改约束。
2. `AGENTS.md` 与 `.specify/memory/constitution.md`。
3. 本 feature 的 `spec.md / plan.md / tasks.md`。
4. packaged truth worktree 中与当前 blocker 直接相关的 frozen docs：
   - `docs/current-status.md`
   - `docs/packaged-mac-diagnostics.md`
   - `docs/runtime-flow.md`
5. packaged truth worktree 中当前存在的 runtime / endpoint contract：
   - `ui/server.mjs`
6. packaged truth worktree 中已存在、会被本 packet 直接继承或保护的 tests：
   - `ui/tests/packaged-runtime-state-stability.test.mjs`
   - `ui/tests/custom-openai-provider-rebind.test.mjs`

边界说明：

- `specs/031-dashboard-model-routing-ui/*` 只作为 Packet B 边界参考，不是 runtime truth authority。
- root worktree 下旧历史 spec / runbook 不得反向定义本 packet。
- 若 frozen docs 与当前 `ui/server.mjs` contract 冲突，以当前 runtime endpoint contract 为准。

## Current Fresh Failure Truth

### Blocker 1 — `/api/status` false positive authority

fresh packaged artifact 中，`/api/status` 当前可能返回：

- `installed: true`
- `daemon: "running"`
- `runtimeMode: "daemon"`

但同一 profile 下，fresh verifier 已确认：

- `openclaw daemon status --json` 与 / 或同 profile runtime probe 不支持该结论；
- `openclaw health --json` 为 false；
- rpc truth 为 false；
- 目标 gateway 端口实际 free。

这意味着 packaged `/api/status` 目前会把 contradictory runtime evidence 误报成 authoritative success。

### Blocker 2 — persisted write 被 generic failure 吞掉

fresh packaged artifact 中，以下两个 endpoint 都可能先成功持久化写盘：

- `POST /api/config/api`
- `POST /api/config/model-routing`

随后又因为：

- `daemon restart failed: Gateway restart timed out after 60s waiting for health checks`

而返回失败。

当前用户面问题不是“数据没写进去”，而是：

1. persistence truth 与 response truth 分离；
2. frontend 只看到 generic failure；
3. 没有 contract 化的 authoritative follow-up path；
4. 手工 follow-up `GET` / reopen 又能读到 persisted state，说明 failure truth 不完整。

## Current Contract Pressure

### `/api/status`

当前 `ui/server.mjs` 中：

- `handleStatus(...)` 直接回读 runtime state；
- `installed` 由 `configExists` 与 runtime truth 粗略组合推出；
- packaged verifier 已证明这个组合在 contradictory runtime evidence 下会产生 false positive。

因此，本 packet 必须把 `/api/status` 从“粗略状态回读”提升为“同 profile authoritative truth”。

### `POST /api/config/api`

当前 contract 具备两段逻辑：

1. 持久化 provider / auth；
2. restart runtime。

现在的问题是：一旦第二段超时，就把第一段已经成功的 persistence truth 一起抹平成 generic failure。

### `POST /api/config/model-routing`

当前 contract 也具备两段逻辑：

1. `saveModelRoutingConfig(...)` 落盘；
2. restart runtime。

同样存在：

- persistence succeeded；
- restart timeout / health timeout；
- response 却只返回 failure；
- 前端无法 contract 化闭环。

## Required Contract Target

### 1. `/api/status` 必须成为 authoritative runtime truth

`/api/status` 必须基于同 profile runtime evidence 收敛 truth，而不是只拿单一路径的 optimistic signal。

最低要求：

- 当 same-profile evidence 已经显示 `health=false`、`rpc=false`、且 gateway port free 或 otherwise 没有当前 runtime listener 时：
  - top-level `installed` MUST NOT 仍然是 `true`
  - top-level `daemon` MUST NOT 仍然是 `"running"`
  - top-level `runtimeMode` MUST NOT 仍然是 `"daemon"`
- contradictory probe set 必须被显式归类为 non-authoritative truth，而不是继续冒充 success。

为避免再出现“顶层值看起来成功，但 verifier 无法分辨为什么不可信”，本 packet 允许 `/api/status` 增加 structured authority evidence，例如：

- `statusAuthority.verdict = authoritative | contradictory | unknown`
- `statusAuthority.reasons[]`
- `statusAuthority.rpcHealthy`

是否采用这组字段名由 implementation 决定，但 tests 必须把最终 contract 固化下来。

### 2. Save contract 必须区分 persistence truth 与 restart truth

对 `POST /api/config/api` 与 `POST /api/config/model-routing`，本 packet 必须明确区分三类结果：

1. `saved`
   - persistence succeeded
   - restart truth 也 succeeded
2. `saved_degraded`
   - persistence succeeded
   - restart timeout / health-check timeout / runtime truth 未完全恢复
   - 但 caller 已拥有 authoritative follow-up path
3. `rejected`
   - persistence itself failed
   - 或 response 无法给出 truthful follow-up contract

### 3. `saved_degraded` 不得再走 generic failure

当 persistence 已成功时：

- response MUST NOT 继续使用“只有 generic failure、没有恢复路径”的 contract；
- response MUST 明确告诉 caller：
  - persisted 是否已经成立；
  - restart 是否成功；
  - authoritative follow-up 要去读哪个 endpoint；
  - 当前 runtime truth 是否 degraded。

### 4. `saved_degraded` 必须使用 caller 可消费的 success lane

为避免现有 packaged frontend 把 persisted truth 继续误判成 hard failure：

- `saved_degraded` MUST 走 `2xx` response lane；
- `ok` MUST 保持 `true`；
- 同时必须补足 structured degraded truth，而不是伪装成纯成功。

推荐最小 shared fields：

- `ok`
- `saveState = saved | saved_degraded`
- `persisted`
- `followUp.statusEndpoint`
- `followUp.configEndpoint`
- `warning` 与 / 或 `warnings`
- `restart.ok`
- `restart.runtimeMode`
- `restart.issue`

endpoint-specific fields 允许继续保留：

- `POST /api/config/model-routing` 的 `mode` / `effectivePrimaryModel` / `message`
- `POST /api/config/api` 的兼容成功响应面

## User Stories

### User Story 1 — Packaged status 不再假阳性（P0）

作为 packaged verifier，我需要 `/api/status` 在同 profile runtime 已不健康时返回 truthful status，而不是继续宣称 installed + daemon running。

**Independent Test**: 当 same-profile probe 已确认 `health=false`、`rpc=false`、且 port free / no current runtime listener 时，`/api/status` 不再返回 `installed:true + daemon:"running" + runtimeMode:"daemon"`。

### User Story 2 — Persisted write 与 restart truth 分开表达（P0）

作为 dashboard 调用方，我需要 save endpoint 在“写盘成功但 restart timeout”时返回 truthful degraded contract，而不是 generic failure。

**Independent Test**: save 在 persistence 已成功时返回 `saved_degraded` 类结果，并提供 authoritative follow-up endpoint，而不是直接 500 generic failure。

### User Story 3 — Packaged save flow 可以闭环（P0）

作为 packaged frontend 使用者，我需要在真实语义下完成保存闭环：要么真正成功，要么收到明确的 degraded truth 与后续 read-back path。

**Independent Test**: fresh packaged artifact 中，save timeout 场景不再把前端卡成“失败但其实已写入且无恢复路径”；follow-up GET / reopen 能被 contract 化地指向 persisted state。

## In Scope

1. 收口 packaged runtime 下 `/api/status` 的 authoritative truth。
2. 收口 `POST /api/config/api` 在 restart timeout / health timeout 场景下的 truthful save contract。
3. 收口 `POST /api/config/model-routing` 在 restart timeout / health timeout 场景下的 truthful save contract。
4. 在 backend response 中定义 authoritative follow-up contract，让 caller 知道何时去读 `/api/status` 与对应 config endpoint。
5. 为上述行为补齐 backend/runtime source tests。
6. 为最终 fresh packaged artifact verification 写清楚 evidence 要求。

## Out of Scope

1. Packet A 的 branded shell / dashboard shell / status card UI wording 重开。
2. Packet B 的 model-routing UI surface / layout / wording 重开。
3. `ui/public/dashboard.html`、`ui/public/dashboard-model-routing-state.mjs`、或其它 `ui/public/*` 的默认改动。
4. Windows、`F-025-B`、或任何 Windows-specific evidence。
5. true `F-014` 的 bot-first / callback / WeCom identity。
6. true `F-027` / `F-031` 的 identity、support promise、或 historical writeback。
7. `ui/lib/model-routing-config.mjs` 的 routing contract 重写。
8. `scripts/model-routing/lib/custom-plugin-routing.mjs` 的 provider id / target / sidecar identity 改写。
9. internal provider id / target 改动：
   - `opensparrow-router`
   - `opensparrow-router/auto`
10. channel contract、vendor、packaging strategy、wrapper strategy、或 build/export surface 扩面。
11. 安装向导 install flow 本身的另一轮 packet。

## Functional Requirements

- **FR-001**: `/api/status` MUST reconcile same-profile daemon truth、health truth、rpc truth、以及 gateway port truth；矛盾 probe 不得继续冒充 success。
- **FR-002**: `/api/status` MUST NOT 在 same-profile evidence 已显示 `health=false`、`rpc=false`、且 port free / no current runtime listener 时仍返回 `installed:true + daemon:"running" + runtimeMode:"daemon"`。
- **FR-003**: `/api/status` MUST 对 contradictory / degraded / unknown runtime evidence 给出可验证的 structured authority explanation；字段名可实现自定，但 tests 必须冻结最终 contract。
- **FR-004**: `POST /api/config/api` MUST 区分 persistence failure、full success、以及 persisted-but-restart-degraded 三类结果。
- **FR-005**: `POST /api/config/model-routing` MUST 区分 persistence failure、full success、以及 persisted-but-restart-degraded 三类结果。
- **FR-006**: 当 persistence 已成功时，两个 save endpoint MUST NOT 再返回“generic failure 且无 authoritative recovery path”的 contract。
- **FR-007**: `saved_degraded` MUST 使用 caller 可消费的 `2xx` success lane，并明确暴露 degraded truth；不得再用 500 把 persisted truth 抹平。
- **FR-008**: `saved_degraded` MUST 至少返回：
  - `ok = true`
  - `saveState = "saved_degraded"`
  - `persisted = true`
  - `followUp.statusEndpoint`
  - `followUp.configEndpoint`
  - `warning` 与 / 或 `warnings`
  - `restart` structured summary
- **FR-009**: `rejected` 只允许用于 persistence 自身失败、或 response 无法给出 truthful follow-up contract 的情况。
- **FR-010**: `POST /api/config/model-routing` 在返回 truthful save contract 时，仍 MUST 保持 `opensparrow-router` / `opensparrow-router/auto` invariant，不得偷换成 native routing。
- **FR-011**: 默认 implementation write-set MUST 收窄在 `ui/server.mjs` 与 backend/runtime tests；若需要触达 `ui/public/*` 才能闭环，MUST stop and escalate。
- **FR-012**: final closeout MUST 经过 fresh packaged artifact verification；source-level PASS 不得直接宣布 combined packaged PASS。

## Non-Goals

- 不做 Packet A 的品牌或 dashboard shell 重开。
- 不做 Packet B 的 routing UI 形态重开。
- 不做新的 channel contract。
- 不做 vendor / packaging / wrapper 策略改写。
- 不做 true `F-014` / `F-027` / `F-031` identity rewrite。
- 不做 internal provider id / target 变更。

## Acceptance

### Source-level acceptance

1. `ui/server.mjs` source contract 已明确区分 authoritative status truth 与 contradictory runtime evidence。
2. `/api/status` 不再在 same-profile `health=false` / `rpc=false` / port free 时宣称 `installed:true + daemon:"running" + runtimeMode:"daemon"`。
3. `POST /api/config/api` 在 persistence 已成功但 restart degraded 时，返回 truthful `2xx` degraded contract，而不是 generic failure。
4. `POST /api/config/model-routing` 在 persistence 已成功但 restart degraded 时，返回 truthful `2xx` degraded contract，而不是 generic failure。
5. 两个 save endpoint 都提供 authoritative follow-up surface，不再要求调用方靠猜测恢复。
6. source tests 明确保护：
   - no false-positive running status
   - no persisted-write generic failure
   - `opensparrow-router` 不变
   - `opensparrow-router/auto` 不变

### Fresh packaged acceptance

最终 closeout 仍需 fresh packaged artifact verification，至少证明：

1. fresh packaged artifact 中，同 profile verifier 若看到 `health=false`、`rpc=false`、且 port free / no current runtime listener，`/api/status` 不再回报 false positive running truth。
2. fresh packaged artifact 中，对 `/api/config/api` 的 save 若落入 “persisted but restart degraded” 场景，response 会给出 truthful degraded contract，而不是 generic failure。
3. fresh packaged artifact 中，对 `/api/config/model-routing` 的 save 若落入同类场景，response 也会给出 truthful degraded contract，而不是 generic failure。
4. 同一个 packaged save flow 可以按 contract 做 follow-up `GET` / reopen，并读回 persisted state。
5. combined packaged verifier 重新检查 Packet A / Packet B 已通过的 shell / model-routing surfaces 时，不发生回退。

## Ownership Freeze

### Default write-set

- `ui/server.mjs`
- `ui/tests/custom-openai-provider-rebind.test.mjs`
- `ui/tests/packaged-runtime-state-stability.test.mjs`
- `ui/tests/packaged-runtime-status-authority.test.mjs`
- `ui/tests/packaged-save-contract-truth.test.mjs`

### Read-only authority / context

- `docs/current-status.md`
- `docs/packaged-mac-diagnostics.md`
- `docs/runtime-flow.md`
- `specs/031-dashboard-model-routing-ui/spec.md`
- `specs/031-dashboard-model-routing-ui/plan.md`
- `specs/031-dashboard-model-routing-ui/tasks.md`
- `ui/public/dashboard.html`
- `ui/public/dashboard-model-routing-state.mjs`

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

- `Packet A` 与 `Packet B` 当前都已 source-level PASS，它们为本 packet 提供 combined packaged baseline，但不再是本 packet 的实现目标。
- 本 packet 只修 backend/runtime truth，不重新定义 Packet A / Packet B 的 scope。
- 默认情况下，本 packet 与 Packet A / Packet B 没有 shared write-set，因此不需要为 `ui/public/*` 做串行等待。
- 如果 implementation 证明必须改 `ui/public/dashboard.html` 或 `ui/public/dashboard-model-routing-state.mjs` 才能消费 truthful degraded contract，则视为 ownership breach，必须停包回 Commander，不得自行扩写面。

## Risk Notes

| 风险 | 等级 | 缓解方式 |
|------|------|----------|
| `/api/status` 只改顶层布尔值，不补 structured authority reason，导致 verifier 仍难归因 | 高 | 允许增加 authority evidence，并用 tests 固化 |
| persisted write 仍返回 500，前端继续误判 hard failure | 高 | `saved_degraded` 强制走 `2xx` lane |
| 顺手把 Packet B 的 UI surface 再并回这个 packet | 高 | `ui/public/*` 默认 forbidden write-set |
| 为修 truth 去改 router identity 或 native routing | 高 | 明确冻结 `opensparrow-router` / `opensparrow-router/auto` |
| 问题真实根因落在 vendor / packaging strategy | 中 | 立即 stop，不在 F-032 内扩 scope |

## Stop Rule

出现以下任一情况，Worker-A 必须立即停包并回 Commander：

1. 需要修改 `ui/public/*` 才能让 truthful degraded contract 被消费。
2. 需要修改 `ui/lib/model-routing-config.mjs` 或 `scripts/model-routing/lib/custom-plugin-routing.mjs` 才能继续。
3. 需要修改 vendor、wrapper、packaging strategy、或 build/export 才能让 `/api/status` truthful。
4. 需求开始滑向 Windows、`F-025-B`、true `F-014`、channel contract、或 true `F-027` / `F-031` identity。
5. 任何方案试图把 `opensparrow-router` 或 `opensparrow-router/auto` 改成别的 internal identity。
