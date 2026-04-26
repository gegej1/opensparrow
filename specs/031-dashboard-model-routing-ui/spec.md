# Feature Specification: Dashboard Model-Routing UI Surface

**Feature ID**: `F-031`  
**Feature Branch**: `031-dashboard-model-routing-ui`  
**Created**: `2026-04-23`  
**Status**: `Completed (source truth PASS + combined packaged PASS, 2026-04-23)`  
**Input**: Commander 已冻结本轮真正缺口是 `dashboard` 上的 model-routing UI surface；Packet A 已 source-level PASS，但 packaged artifact parity 要留到最终 combined verification；本轮必须先补一个新的 follow-up `spec / plan / tasks`，再允许 Worker-B 实现。

## Closeout Evidence (`2026-04-23`)

- `Packet B / F-031 source truth PASS`
- fresh combined packaged verification 已确认：
  - GTClaw branding PASS
  - dedicated model-routing UI surface exists PASS
  - `POST /api/config/api` limited to compatibility lane PASS
  - authoritative `GET/POST /api/config/model-routing` load/save PASS
  - follow-up `GET` / reopen 读回 persisted truth PASS
  - internal ids unchanged PASS：
    - `opensparrow-router`
    - `opensparrow-router/auto`
- 本 closeout 不把 custom plugin routing 改写成 native routing，也不改写 true `F-027` identity

## 一句话定义

`F-031 = 只为 dashboard 补齐 authoritative model-routing UI surface 的 follow-up feature；它是 Packet B 的 UI surface 补包，不是重定义 true F-027 identity，也不是把 custom plugin routing 偷换成 native routing。`

## Follow-up Freeze

- 本 feature 只处理 `dashboard` 上“模型智能路由 UI surface 缺失”这一条 gap。
- 本 feature 不 rewrite true `F-027`，也不定义 true `F-027` 的历史身份；本 feature 只消费并保护 `opensparrow-router` / `opensparrow-router/auto` 这组 internal invariants。
- root worktree 下旧 `specs/027-mac-ui-first-release-readiness/` 只作为 stale historical context，不是本 feature 的 authority。
- 本 feature 不允许把 internal routing contract 从 custom plugin routing 改写成 native provider routing。
- internal invariant 必须保持：
  - provider id = `opensparrow-router`
  - target = `opensparrow-router/auto`
- `Packet A` 已 source-level PASS，但 `ui/public/dashboard.html` 与 `ui/public/replay-surfaces.test.mjs` 仍属于 shared write-set；Worker-B 必须串行等待 Packet A 释放写面后才能开始实现。
- `F-031` 的 source-level完成不等于最终 closeout；最终 closeout 仍需和 Packet A 一起经过 fresh packaged artifact verification。

## Authority / Truth Source

本 feature 的 authority 顺序固定为：

1. 用户本轮冻结事实与禁改约束。
2. `AGENTS.md` 与 `.specify/memory/constitution.md`。
3. 本 feature 的 `spec.md / plan.md / tasks.md`。
4. packaged truth worktree 中与当前 gap 直接相关的 frozen docs：
   - `docs/current-status.md`
   - `docs/runtime-flow.md`
5. packaged truth worktree 中当前存在的 endpoint / contract 实现：
   - `ui/server.mjs`
   - `ui/lib/model-routing-config.mjs`
   - `scripts/model-routing/lib/custom-plugin-routing.mjs`

补充规则：

- `GET /api/config/model-routing` 与 `POST /api/config/model-routing` 是 authoritative model-routing surface。
- `POST /api/config/api` 只保留为 upstream connection / compatibility lane；`ui/server.mjs` 现有注释已经明确 “model-routing owns the new authority surface”。
- 若 `docs/current-status.md` 或 `docs/runtime-flow.md` 的 wording 与当前 `ui/server.mjs` endpoint contract 冲突，以当前 endpoint contract 为准。
- `docs/runtime-flow.md` 与 `docs/current-status.md` 都提到 `ui/public/dashboard-model-routing-state.mjs`，但当前 worktree 中该文件并不存在；这说明本轮允许新增该 UI state file，但不授权修改 backend contract。

## Current Authoritative Contract

### Dashboard 状态 truth

`GET /api/status` 当前 authoritative payload 至少提供：

- `installed`
- `daemon`
- `runtimeMode`
- `version`
- `profile`
- `configPath`
- `gatewayPort`

这条 status truth 继续归 Packet A 管；Packet B 不重写它，只消费它。

### Model-routing read/write truth

`GET /api/config/model-routing` 当前 read-back payload 由 `getModelRoutingConfig(...)` 提供，核心字段包括：

- `mode`
- `connection.baseUrl`
- `connection.baseUrlConfigured`
- `connection.apiKeyConfigured`
- `singleModeDefaultModel`
- `tierModelMap`
- `routing`
- `effectivePrimaryModel`
- `router.providerId`
- `router.modelTarget`
- `router.configPresent`

`POST /api/config/model-routing` 当前 save payload 由 `saveModelRoutingConfig(...)` 消费：

- `mode = single | smart`
- `single` 模式下使用 `singleModeDefaultModel`
- `smart` 模式下使用 `tierModelMap + routing`

成功响应至少包括：

- `ok`
- `mode`
- `effectivePrimaryModel`
- `message`
- 可选 `runtimeMode`
- 可选 `warning`

### API configuration compatibility lane

`POST /api/config/api` 当前 contract 仍负责：

- 保存 `models.providers.openai`
- 保存 `auth-profiles.json`
- runtime restart

但它不是 routing truth；它只是：

- upstream connection lane
- compatibility lane
- legacy API form lane

因此本轮 dashboard UI 不得把“旧 API 配置表单”冒充为 routing surface。

## User Stories

### User Story 1 — Dashboard 有明确的 model-routing UI surface（P0）

作为 packaged Mac dashboard 的维护者，我需要在 `dashboard` 中看到明确的模型智能路由 surface，而不是只剩旧 `API 配置` 表单。

**Independent Test**: 打开 `dashboard` 后，能在 UI 上分辨“上游 API 连接配置”和“模型智能路由配置”是两条不同 surface。

### User Story 2 — Load / save 走 authoritative model-routing endpoints（P0）

作为维护者，我希望 dashboard 的 routing UI 在读取和保存时都走 `GET/POST /api/config/model-routing`，而不是靠本地草稿或旧 API form 伪造状态。

**Independent Test**: load 时读 `/api/config/model-routing`；save 后再读 authoritative read-back，而不是直接拿提交 payload 本地重放。

### User Story 3 — Internal routing identity 不漂移（P0）

作为 commander，我希望 Worker-B 只补 UI surface，不修改 internal router identity，也不把 custom plugin routing 偷换成 native provider UI。

**Independent Test**: source tests 和 combined packaged verification 都能证明：

- provider id 仍是 `opensparrow-router`
- target 仍是 `opensparrow-router/auto`
- UI 没有出现“选择任意 native provider 作为 routing truth”的新定义

## In Scope

1. 为 `dashboard` 增加明确的 model-routing UI surface。
2. 让该 UI surface 基于 `GET /api/config/model-routing` 读取 authoritative routing state。
3. 让该 UI surface 基于 `POST /api/config/model-routing` 保存 routing state。
4. save 后强制以 authoritative read-back 刷新 UI，而不是本地假回放。
5. 保留 `API 配置` 页作为 upstream connection / compatibility lane，并在 UI 层明确它不是 routing truth。
6. 为上述行为补齐 source tests，并把 packaged verification requirements 写清楚。
7. 明确串行依赖：必须等待 Packet A 释放 `dashboard.html` 写面。

## Out of Scope

1. Windows、`F-025-B`、或任何 Windows-specific evidence。
2. true `F-014` 的 bot-first floor、callback gate、或 WeCom channel identity。
3. true `F-027` 的既有 identity / support promise / closeout writeback 的任何重写或重新定义。
4. channel contract / DingTalk / WeCom / Feishu baseline 重定义。
5. `ui/server.mjs` backend contract 扩面。
6. `ui/lib/model-routing-config.mjs` 的 router provider / target contract 改写。
7. `scripts/model-routing/lib/custom-plugin-routing.mjs` 的 provider id / target / sidecar identity 改写。
8. vendor、packaging runtime、或 artifact generation surfaces。
9. 把 routing UI 改造成 native provider chooser。

## Functional Requirements

- **FR-001**: dashboard MUST 存在明确的 model-routing UI surface，而不是只有旧 `API 配置` 表单。
- **FR-002**: dashboard MUST 用 `GET /api/config/model-routing` 作为 routing read-back 的唯一 authoritative source。
- **FR-003**: dashboard MUST 用 `POST /api/config/model-routing` 作为 routing save 的唯一 authoritative write surface。
- **FR-004**: save 成功后，UI MUST 再次读取 authoritative routing state，而不是直接使用本地提交 payload 做假回放。
- **FR-005**: `API 配置` 页 MUST 保留为 upstream connection / compatibility lane，但 MUST NOT 被表述为 routing truth。
- **FR-006**: UI MUST NOT 允许修改 internal provider id；任何 routing surface wording 都必须保持 `opensparrow-router` 为 internal provider id。
- **FR-007**: UI MUST NOT 允许修改 internal target；任何 routing surface wording 都必须保持 `opensparrow-router/auto` 为 smart target。
- **FR-008**: UI MUST NOT 把 custom plugin routing 重新定义成 native provider routing，也 MUST NOT 把 `models.providers.openai` 直接表述成 smart routing truth。
- **FR-009**: Worker-B MUST 串行等待 Packet A 释放 `ui/public/dashboard.html` 与 `ui/public/replay-surfaces.test.mjs` 写面。
- **FR-010**: source-level completion MUST 包含 fresh source tests；最终 closeout MUST 额外包含 fresh packaged artifact verification。
- **FR-011**: 若 Worker-B 发现当前 endpoint shape 无法支撑 UI surface，MUST stop and escalate，而不是自行改 backend contract。
- **FR-012**: 本轮实现 MUST 保持在 `ui/public/*` 与测试写面，不得顺手改 backend、vendor、Windows、channel contract 或 packaged runtime。

## Non-Goals

- 不做新的 router backend contract。
- 不做 native provider UI。
- 不做 session rebind follow-up。
- 不做 Packet A 的 branding / status truth 重开。
- 不做 docs / longrun closeout。
- 不做 packaged artifact 重切本身；combined packaged verification 由后续整体验证承担。

## Acceptance

### Source-level acceptance

1. dashboard 中存在明确的 model-routing UI surface，而不是只有旧 `API 配置` 表单。
2. routing UI load 使用 `GET /api/config/model-routing`。
3. routing UI save 使用 `POST /api/config/model-routing`。
4. save 后 UI 用 authoritative read-back 刷新，而不是本地假回放。
5. `API 配置` 页仍存在，但其语义被限定为 upstream connection / compatibility lane。
6. source tests 明确保护：
   - provider id 仍是 `opensparrow-router`
   - target 仍是 `opensparrow-router/auto`
   - UI 没有把 routing 改写成 native provider truth

### Combined packaged acceptance

最终 closeout 还必须追加 combined packaged verification，至少证明：

1. 带上 Packet A + Packet B 的 fresh packaged artifact 中，dashboard 同时呈现：
   - GTClaw branded shell
   - authoritative status truth
   - dedicated model-routing UI surface
2. packaged dashboard 的 routing load/save 仍然走 authoritative `/api/config/model-routing`。
3. packaged save 之后，刷新或 re-open 仍以 authoritative read-back 为准。
4. packaged artifact 中没有因为 UI surface 引入 provider/target drift。

## Serial Dependency

### 为什么必须等待 Packet A

`Packet A` 与本 feature 共享以下 write-set：

- `ui/public/dashboard.html`
- `ui/public/replay-surfaces.test.mjs`

而且 Packet A 当前已经在修：

- GTClaw branding shell
- authoritative status truth
- version fallback truth

若 Worker-B 在 Packet A 未释放写面时并行进入：

1. `dashboard.html` 的 owner 会冲突；
2. `replay-surfaces.test.mjs` 的回归归因会混杂；
3. 最终 packaged verification 无法区分“shell truth regressions”与“routing UI regressions”。

因此本 feature 的 implementation precondition 是：

- Packet A 已 source-level PASS；
- Commander 已明确释放 `dashboard.html` / `replay-surfaces.test.mjs` 写面；
- Worker-B 只在此之后开工。

## Risk Notes

| 风险 | 等级 | 缓解方式 |
|------|------|----------|
| Worker-B 为了补 UI surface 顺手改 backend endpoint | 高 | 明确 `ui/server.mjs` 只读；若 endpoint 不够用，直接 stop |
| 把 API 配置页重新定义成 routing truth | 高 | spec 中冻结 `API 配置 = compatibility lane` |
| 把 custom plugin routing 偷换成 native routing | 高 | 以 `opensparrow-router` / `opensparrow-router/auto` 作为 negative invariant |
| Packet A / Packet B 并发修改 `dashboard.html` | 高 | 串行 gate，先等 Packet A 释放 write-set |
| 只做 source smoke 就自称 close | 中 | 明确 final closeout 仍需 combined packaged verification |

## Stop Rule

出现以下任一情况，Worker-B 必须立即停包并回 Commander：

1. Packet A 还未释放 `ui/public/dashboard.html` 或 `ui/public/replay-surfaces.test.mjs` 写面。
2. 需要修改 `ui/server.mjs`、`ui/lib/model-routing-config.mjs`、`scripts/model-routing/lib/custom-plugin-routing.mjs` 才能继续。
3. 需求开始滑向 Windows、`F-025-B`、true `F-014`、channel contract、vendor、或 packaged runtime。
4. UI 方案开始把 routing 改写成 native provider UI。
5. 任何人试图把 `opensparrow-router` 或 `opensparrow-router/auto` 改成别的 internal identity。
