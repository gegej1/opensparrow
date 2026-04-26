# Dashboard Model-Routing UI Surface Implementation Plan

> **For agentic workers:** 本计划只允许执行 Packet B 的 dashboard UI surface follow-up。先等 Packet A 释放 `ui/public/dashboard.html` 写面，再按本文档顺序执行。

**Goal:** 为 dashboard 补齐 authoritative model-routing UI surface，同时保持 `opensparrow-router` / `opensparrow-router/auto` internal invariant，不改 backend contract。  
**Architecture:** 通过一个新的前端 state module 承接 `GET/POST /api/config/model-routing` 的 read/write 与 read-after-write 刷新，再把该 state module 接入 `ui/public/dashboard.html` 的独立 routing surface。`API 配置` 继续只负责 upstream connection / compatibility lane，不承担 routing truth。  
**Tech Stack:** `ui/public/dashboard.html`、前端 `.mjs` 状态模块、`node:test` VM/browserless replay tests、现有 `ui/server.mjs` endpoints 作为只读 authority。

---

## 0. Plan Positioning

- 这不是 true `F-027` 的 identity rewrite。
- 这不是 backend contract packet。
- 这不是 native routing packet。
- 这是 `dashboard model-routing UI surface` 的最小 follow-up implementation plan。

## 1. Serial Preconditions

Worker-B 开工前必须满足以下前提：

1. Packet A 已 source-level PASS。
2. Commander 已明确释放以下 shared write-set：
   - `ui/public/dashboard.html`
   - `ui/public/replay-surfaces.test.mjs`
3. 当前任务仍保持在 UI surface follow-up，不需要 backend contract 变更。

若以上任一条件不成立，Worker-B 不得开工。

## 2. File Structure / Ownership

### Worker-B 允许写入的目标文件

- `ui/public/dashboard.html`
  - 作用：承载 dashboard 内部的 model-routing UI host surface，并把它和现有 `API 配置` lane 明确分开。
- `ui/public/dashboard-model-routing-state.mjs`
  - 作用：新增前端 routing state module，负责 authoritative load/save、draft state、read-after-write refresh、invariant guard。
- `ui/public/replay-surfaces.test.mjs`
  - 作用：补齐 dashboard routing surface 的 replay / read-after-write / compatibility-lane tests。
- `ui/tests/dashboard-model-routing-ui.test.mjs`
  - 作用：新增 source-level test，锁定 UI surface 的存在性、wording、invariant exposure、以及与 Packet A shell truth 的相容性。

### Worker-B 只读 authority 文件

- `ui/server.mjs`
- `ui/lib/model-routing-config.mjs`
- `scripts/model-routing/lib/custom-plugin-routing.mjs`
- `ui/tests/dashboard-status-shell.test.mjs`
- `docs/current-status.md`
- `docs/runtime-flow.md`

### Worker-B 禁止修改的文件

- `ui/server.mjs`
- `ui/lib/model-routing-config.mjs`
- `scripts/model-routing/lib/custom-plugin-routing.mjs`
- `vendor/**`
- `platforms/**`
- `docs/**`
- `longrun/**`
- 任何 Windows 相关文件

## 3. Implementation Order

### Phase 0 — Serialization Gate

先确认 Packet A 已释放 `dashboard.html` 与 `replay-surfaces.test.mjs` 写面，并记录当前 source baseline。

### Phase 1 — Dedicated Routing State Module

创建 `ui/public/dashboard-model-routing-state.mjs`，把下列职责从 `dashboard.html` 内联脚本里抽出：

- authoritative `GET /api/config/model-routing` load
- authoritative `POST /api/config/model-routing` save
- save 后的 read-after-write refresh
- single/smart mode UI state
- `opensparrow-router` / `opensparrow-router/auto` invariant guard
- compatibility lane explanation data

注意：

- 该 module 只能消费现有 endpoint shape；
- 不得修改 backend payload；
- 若现有 payload 不够，立即 stop。

### Phase 2 — Dashboard Host Integration

修改 `ui/public/dashboard.html`，把 Phase 1 的 state module 接到一个明确的 dashboard surface 上：

- UI 必须能看出“模型智能路由”是独立 surface；
- `API 配置` 继续存在，但文案必须表明它是 upstream connection / compatibility lane；
- save 成功后必须触发 authoritative refresh；
- UI 不得暴露 provider id/target 可编辑控件；
- UI 不得把 routing truth 写成 native provider 选择器。

### Phase 3 — Source Test Closure

补两类 source tests：

1. `ui/public/replay-surfaces.test.mjs`
   - 保护 authoritative load/save/read-after-write
   - 保护 `API 配置 != routing truth`
2. `ui/tests/dashboard-model-routing-ui.test.mjs`
   - 保护独立 surface 存在
   - 保护 wording / invariant / non-native-routing contract

同时回归运行 Packet A 的 shell/status tests，确保 routing UI 没把 branding/status truth 回退。

### Phase 4 — Verification Handoff

Worker-B source-level 完成后，只能给出：

- fresh source test PASS
- ready for combined packaged verification

不得直接宣称 packet 已最终 close，因为最终 closeout 仍依赖：

- Packet A + Packet B 合并后的 fresh packaged artifact
- browser / API combined verification

## 4. Why This Must Stay Serial After Packet A

Worker-B 之所以必须串行等待 Packet A，原因有三条：

1. **共享写面冲突**
   - `ui/public/dashboard.html`
   - `ui/public/replay-surfaces.test.mjs`

2. **回归归因冲突**
   - Packet A 管 branded shell / status truth
   - Packet B 管 routing UI surface
   - 并行修改会让同一份 dashboard 回归无法归因

3. **最终 packaged verification 需要 combined truth**
   - packaged verifier 必须在同一个 artifact 里同时看到：
     - GTClaw shell
     - authoritative status truth
     - model-routing UI surface
   - 若 A/B 未串行稳定，verifier 无法判断问题属于哪一个 packet

## 5. Verification Plan

### Source-level verification

必须执行至少以下验证：

- `node --check ui/public/dashboard-model-routing-state.mjs`
- `node --test ui/tests/dashboard-model-routing-ui.test.mjs`
- `node --test ui/public/replay-surfaces.test.mjs`
- `node --test ui/tests/dashboard-status-shell.test.mjs`

### Combined packaged verification handoff

Packet B 不单独完成 packaged closeout，但必须把 combined verifier 要检查的点写清楚：

1. packaged dashboard 中存在独立 model-routing UI surface；
2. packaged load 使用 `GET /api/config/model-routing`；
3. packaged save 使用 `POST /api/config/model-routing`；
4. save 后刷新页面或重开 dashboard，UI 仍以 authoritative read-back 为准；
5. packaged artifact 中未出现 `opensparrow-router` / `opensparrow-router/auto` drift；
6. `API 配置` 页仍只是 compatibility lane。

## 6. Stop Conditions

Worker-B 在任一阶段发现以下情况，必须停止实施并回 Commander：

1. 需要 backend contract 变更。
2. 需要改 `ui/lib/model-routing-config.mjs` 或 `scripts/model-routing/lib/custom-plugin-routing.mjs` 才能成立。
3. 当前 dirty workspace 中 Packet A 写面仍未释放。
4. UI 方案开始滑向 native provider routing。
5. 任何验收项开始涉及 Windows、true `F-014`、channel contract、vendor 或 packaged runtime。
