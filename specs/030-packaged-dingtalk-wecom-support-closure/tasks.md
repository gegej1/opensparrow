# Tasks: Packaged DingTalk / WeCom Support Closure

**Feature ID**: `F-030`  
**Dispatch rule**: channel-specific gate、packaged-artifact-first、facts-only closeout。禁止把 officialization、Windows、`F-027` rewrite、true `F-014` rewrite、callback 默认 gate、或 broad cleanup 混入本 feature。

## `2026-04-22` 完成快照

- `T030-SPEC-1`：已完成。
- `T030-REV-1`：已完成。
- `T030-A-1 / A-2 / A-3`：已完成。
- `T030-B-1 / B-2`：已完成；DingTalk packaged route 已补齐真实输入、install truth、runtime-state 稳定 read-back 与 diagnostics/package-local 一致性。
- `T030-C-1 / C-2`：已完成；WeCom packaged route 已迁到官方插件并完成 bot-first packaged proof。
- `T030-D-1 / D-2 / D-3`：已完成；DingTalk / WeCom 均已拿到 `PASS` verdict，feature-level gate 已满足。
- `T030-E-1`：本轮执行 docs / longrun facts-only writeback。

## 派工前统一约束

- `F-030` 是新 feature，不是 `F-027` 的补丁注释；
- `F-025-B` 必须继续保持 `blocked on Windows-specific evidence`；
- true `F-014` 仍然是 bot-first 长连接主链，最小真实入口是 `Bot ID + Secret`；
- `F-026` 与 `F-027` 的 closeout 不得回退；
- `bounded probe != packaged ready`；
- `dashboard readable != full channel closure`；
- `PKT-030-B` / `PKT-030-C` 只做 implementation closure，不给 `PASS`；
- `PKT-030-D` 只能做 fresh live verification；
- `PKT-030-E` 只能做 facts-only closeout / longrun writeback；
- noisy workspace 下必须做 packet attribution，不能把整仓 dirty state 视为当前 packet 越界；
- `B/C` 默认 serial；只有 Commander 明确 disjoint write-set 才允许并行。
- 当前 latest packaged lineage 已让 `T030-D-1` 与 `T030-D-2` 双双得到 `PASS`，但这不自动放开 Windows 线或 officialization 线。

## Spec Freeze

### T030-SPEC-1 — 冻结 F-030 文档边界

- **Goal**: 产出可供 review 的 `spec.md / plan.md / tasks.md`，把 feature 身份、channel gate、inadmissible evidence、packet attribution、stop rule 一次性冻住。
- **Input**:
  - `AGENTS.md`
  - `docs/项目持久化说明.md`
  - `docs/governance/README.md`
  - `docs/governance/framework-stack.md`
  - `.specify/memory/constitution.md`
  - `specs/025-channel-replay-doc-parity/*`
  - `specs/027-mac-ui-first-release-readiness/*`
  - `specs/011-wecom-channel-integration/spec.md`
  - `docs/runbooks/F-014-wecom-channel-integration.md`
- **Output**:
  - `specs/030-packaged-dingtalk-wecom-support-closure/spec.md`
  - `specs/030-packaged-dingtalk-wecom-support-closure/plan.md`
  - `specs/030-packaged-dingtalk-wecom-support-closure/tasks.md`
- **Done when**:
  - DingTalk / WeCom passing gate 分开写清楚；
  - inadmissible evidence、role separation、packet attribution 已冻结；
  - `F-025-B` / true `F-014` / `F-026` / `F-027` guard 全部清楚。
- **Blocked when**:
  - 文档仍可被误读为 officialization 或 `F-027` rewrite。

## Review Gate

### T030-REV-1 — SpecReviewer 审核 `Ready for PKT-030-A dispatch`

- **Goal**: 只审 `spec / plan / tasks` 是否已达到可派工状态。
- **Reviewer checklist**:
  1. `F-030` 是否被明确写成新的 packaged support closure feature；
  2. 是否明确 `F-025-B` 不动；
  3. 是否明确 true `F-014` 仍是 bot-first / `Bot ID + Secret` / callback 非默认 gate；
  4. 是否明确 DingTalk / WeCom 不能互相借证；
  5. 是否明确 `bounded probe != packaged ready` 与 `dashboard readable != full channel closure`；
  6. 是否明确 `B/C` 只做 implementation、`D` 只做 verification、`E` 只做 facts-only closeout。
- **Done when**:
  - Reviewer 输出 `Ready for PKT-030-A dispatch`。
- **Blocked when**:
  - 任意边界仍然模糊或 self-contradictory。

## PKT-030-A：feature freeze / support promise / channel-specific evidence gate

### T030-A-1 — 冻结 feature identity 与 support promise

- **Goal**: 把 `F-030` 从 `F-027` 历史 outward promise 中剥离出来，明确写成新的 packaged DingTalk / WeCom support closure feature。
- **Read-set**:
  - `specs/027-mac-ui-first-release-readiness/spec.md`
  - `specs/027-mac-ui-first-release-readiness/packaged-mac-release-surface-inventory.md`
  - 当前 packaged candidate lineage 背景
- **Write-set**:
  - `specs/030-packaged-dingtalk-wecom-support-closure/spec.md`
- **Must state**:
  1. `F-027` WeCom de-scope 不是 true `F-014` 失败；
  2. `F-027` DingTalk outward promise 不自动等于 `F-030` PASS；
  3. officialization 不属于当前 feature。
- **Done when**:
  - 读者不会再把 `F-030` 误读成 historical promise backfill。

### T030-A-2 — 冻结 per-channel gate 与 inadmissible evidence

- **Goal**: 把 DingTalk / WeCom 的 passing gate 与 inadmissible evidence 具体写死。
- **Must include**:
  1. DingTalk 需要真实输入 route + packaged install / status / dashboard / lifecycle 全链路；
  2. WeCom 不得低于 true `F-014` floor；
  3. `bounded probe`、`dashboard readable`、Feishu PASS、旧截图、旧 longrun 都不算 packaged closure evidence。
- **Done when**:
  - Commander 可以直接把这部分原文塞进 worker / verifier prompt。

### T030-A-3 — 冻结 packet attribution 与 role separation

- **Goal**: 把 noisy workspace 规则、serial default、owner/reviewer/verifier 分离写成硬 guard。
- **Must state**:
  1. `B/C` 默认 serial；
  2. reviewer / verifier 不能与主写者重叠；
  3. 认定 scope drift 时必须指出具体 file / artifact surface；
  4. 不允许把整仓 dirty state 当成当前 packet 越界证明。
- **Done when**:
  - 文档足以在 noisy workspace 里执行而不失控。

## PKT-030-B：DingTalk packaged closure implementation

### T030-B-1 — 收口 DingTalk packaged implementation surface

- **Goal**: 只修 DingTalk packaged closure 直接依赖的实现 / wording / artifact-generation gap。
- **Read-set**:
  - `specs/024-unified-channel-contract-baseline/*`
  - `specs/025-channel-replay-doc-parity/replay-truth-inventory.md`
  - 当前 Commander 指定 packaged candidate lineage
  - DingTalk 相关 source / docs / packaging surfaces
- **Allowed outcomes**:
  1. 把 DingTalk 推到 `ready for fresh live verification`；
  2. 或者形成 clear `BLOCKED / DECISION REQUIRED`。
- **Must not do**:
  - 不宣称 DingTalk `PASS`；
  - 不把 parser-only success、`/api/status` reachability、Dashboard 可达写成 closure；
  - 不把 `corpId` / `robotCode` 反写成 blocking gate。
- **Done when**:
  - DingTalk 只剩真实输入与 live verification 问题，或 blocker 归因清楚。

### T030-B-2 — 预备 DingTalk live verification route

- **Goal**: 把 DingTalk 的真实输入 route、操作前提、与 `D` 所需 fresh evidence 面准备到可验证状态。
- **Must preserve**:
  - secret 只允许写成“用户已提供的真实凭据”或“本机已有真实 profile / state”；
  - 不在 repo 落盘 secret；
  - 不跳过 packaged artifact 直接借 source tree。
- **Done when**:
  - verifier 拿到清楚的 DingTalk live verification 起点，而不是再自己猜。

## PKT-030-C：WeCom packaged closure implementation

### T030-C-1 — 收口 WeCom bot-first packaged implementation surface

- **Goal**: 只修 WeCom packaged closure 直接依赖的 implementation / wording / runtime-plugin / artifact-generation gap。
- **Read-set**:
  - `specs/011-wecom-channel-integration/spec.md`
  - `docs/runbooks/F-014-wecom-channel-integration.md`
  - 当前 Commander 指定 packaged candidate lineage
  - WeCom 相关 source / docs / packaging surfaces
- **Must inherit**:
  1. bot-first mainline；
  2. `Bot ID + Secret` minimal real entry；
  3. callback 非默认 gate。
- **Must not do**:
  - 不宣称 WeCom `PASS`；
  - 不把 bounded probe、existing config readable、或 UI 字段可见写成 packaged ready；
  - 不把 packaged gap 反写成 true `F-014` failure。
- **Done when**:
  - WeCom 只剩真实输入与 live verification 问题，或 blocker 归因清楚。

### T030-C-2 — 预备 WeCom live verification route

- **Goal**: 为 `D` 准备不低于 true `F-014` floor 的 packaged live verification route。
- **Must state**:
  1. packaged bot-first enablement 如何验证；
  2. packaged status / dashboard / lifecycle evidence 如何闭环；
  3. 哪个点仍是 `EVIDENCE GAP`，哪个点已 ready。
- **Done when**:
  - verifier 不需要重新解释 true `F-014` floor 才能执行。

## PKT-030-D：fresh live verification-only

### T030-D-1 — DingTalk fresh live verification

- **Goal**: 在 packaged candidate lineage 上给 DingTalk 出 verdict。
- **Verifier must check**:
  1. 是否基于真实输入 route；
  2. 是否完成 packaged live install 或 Commander-accepted state activation；
  3. 是否有 post-install status / dashboard / lifecycle fresh evidence；
  4. 是否仍然只是 parser / status / dashboard reachability 假阳性。
- **Done when**:
  - DingTalk verdict 明确为 `PASS / BLOCKED / DECISION REQUIRED / EVIDENCE GAP`。

### T030-D-2 — WeCom fresh live verification

- **Goal**: 在 packaged candidate lineage 上给 WeCom 出 verdict，且不得低于 true `F-014` floor。
- **Verifier must check**:
  1. 是否沿 bot-first mainline；
  2. 是否使用真实 `Bot ID + Secret` route；
  3. 是否有 packaged status / dashboard / lifecycle closure；
  4. 是否具备不低于 true `F-014` floor 的 real packaged evidence；
  5. 是否有人试图用 bounded probe / existing config readable 伪造 ready。
- **Done when**:
  - WeCom verdict 明确为 `PASS / BLOCKED / DECISION REQUIRED / EVIDENCE GAP`。

### T030-D-3 — feature-level verdict synthesis

- **Goal**: 在不发明新 authority 的前提下，把 DingTalk / WeCom verdict 合成为 feature-level状态建议。
- **Must state**:
  1. 哪个 channel 已过 gate；
  2. 哪个 channel 未过 gate；
  3. 为什么 `F-030` 仍 open 或可进入 `E`。
- **Done when**:
  - Commander 可以基于 verifier 输出决定是否开 `E`。

## PKT-030-E：facts-only closeout / longrun writeback

### T030-E-1 — 只搬运 D 已证实的事实

- **Goal**: 只把 `D` 已证实的 packaged facts 写回长期记忆层。
- **Allowed write-set**:
  - `longrun/workspaces/opensparrow-unified/feature_list.json`
  - `longrun/workspaces/opensparrow-unified/claude-progress.txt`
- **Must preserve**:
  1. `F-025-B = blocked on Windows-specific evidence`
  2. true `F-014` 的 bot-first 成立
  3. `F-026` / `F-027` closeout 不回退
  4. officialization 继续留在别的线
- **Done when**:
  - longrun 只反映 `D` 已证实的 per-channel facts；
  - 没有借 closeout 反向制造 PASS。
- **Blocked when**:
  - `D` 尚未给出足够 clear 的 channel verdict。
