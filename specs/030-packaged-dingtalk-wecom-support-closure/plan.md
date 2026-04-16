# Commander Plan: Packaged DingTalk / WeCom Support Closure

**Feature ID**: `F-030`  
**Feature Branch**: `030-packaged-dingtalk-wecom-support-closure`  
**Plan Status**: Draft for Review  

## 战役摘要

`F-030` 不是 officialization，也不是把 `F-027` 的 historical packaged promise 改写成“当时就已经做完 DingTalk / WeCom closure”。  
它要回答的是：

> 在当前 packaged candidate lineage 上，DingTalk 与 WeCom 分别需要什么 implementation closure、什么 fresh live evidence、以及什么 stop rule，才能被独立地记为 packaged support ready？

当前 feature 必须吸收的 frozen assumptions：

- `F-025-B` 继续 `blocked on Windows-specific evidence`；
- true `F-014` 继续是 bot-first 长连接主链，最小真实入口是 `Bot ID + Secret`；
- `F-026` 与 `F-027` closeout 不得回退；
- `F-027` 的 WeCom de-scope 是历史 outward promise narrowing，不是 true `F-014` 失败；
- officialization 仍是另一条线。

## Packet 顺序与依赖

- `SPEC-030-R1` 必须先过 review gate，才允许 dispatch `PKT-030-A`；
- `PKT-030-A` 先冻结 feature identity、support promise、evidence gate、packet attribution；
- `PKT-030-B` 与 `PKT-030-C` 默认 **serial**，因为它们高度可能共享 packaged docs、artifact generation、`ui/server.mjs`、Dashboard surface 与 release wording write-set；
- 只有在 Commander 先冻结 disjoint write-set 时，`B/C` 才允许并行；
- `PKT-030-D` 只能在 Commander 接受 `B/C` 已把各自 channel 推到 “ready for live verification / explicit blocker” 后启动；
- `PKT-030-E` 只能在 `D` 已给出 channel verdict 后启动，且只能 facts-only writeback；
- 任一 packet 一旦滑向 Windows、officialization、broader docs parity、callback 默认 gate、或整仓 cleanup，必须立即停包并回 Commander。

## Review Gate

### SPEC-030-R1：Ready-for-dispatch review

- **Goal**: 只审 `spec.md / plan.md / tasks.md` 是否已经达到 `Ready for PKT-030-A dispatch`。
- **Reviewer must check**:
  - `F-030` 是否明确是独立 feature，而不是 `F-027` rewrite 或 officialization sidecar；
  - 是否明确保留 `F-025-B = blocked on Windows-specific evidence`；
  - 是否明确保留 true `F-014 = bot-first / Bot ID + Secret / callback 非默认 gate`；
  - 是否把 DingTalk / WeCom passing gate 分开写清楚；
  - 是否明确 `bounded probe != packaged ready` 与 `dashboard readable != full channel closure`；
  - 是否把 packet attribution、role separation、serial default 讲清楚。
- **DONE when**:
  - Reviewer 明确输出：`Ready for PKT-030-A dispatch`。
- **BLOCKED when**:
  - 任何冻结边界仍然含糊，或 `F-030` 身份仍可能被误读。

## PKT-030-A：feature freeze / support promise / channel-specific evidence gate

- **Goal**: 冻结 `F-030` 的 feature 身份、support promise、per-channel passing gate、admissible evidence、inadmissible evidence、以及 packet attribution 规则。
- **Allowed work**:
  - 只改 `specs/030-packaged-dingtalk-wecom-support-closure/`；
  - 明确 current candidate lineage、carryover facts、current channel verdict 背景；
  - 明确 `B/C/D/E` 角色与 stop rule。
- **Must preserve**:
  - 不改写 `F-025-B` / true `F-014` / `F-026` / `F-027`；
  - 不推进 officialization；
  - 不做实现、不做 longrun writeback。
- **Read-set**:
  - `AGENTS.md`
  - `docs/项目持久化说明.md`
  - `docs/governance/README.md`
  - `docs/governance/framework-stack.md`
  - `.specify/memory/constitution.md`
  - `longrun/workspaces/opensparrow-unified/app_spec.md`
  - `specs/025-channel-replay-doc-parity/*`
  - `specs/027-mac-ui-first-release-readiness/*`
  - `specs/011-wecom-channel-integration/spec.md`
  - `docs/runbooks/F-014-wecom-channel-integration.md`
- **Write-set**:
  - `specs/030-packaged-dingtalk-wecom-support-closure/spec.md`
  - `specs/030-packaged-dingtalk-wecom-support-closure/plan.md`
  - `specs/030-packaged-dingtalk-wecom-support-closure/tasks.md`
- **DONE when**:
  - Commander 能直接用文档派工，不再补 freeze wording；
  - DingTalk / WeCom passing gate、inadmissible evidence、packet attribution 已冻结；
  - feature-level PASS threshold 已写清楚。
- **BLOCKED when**:
  - 文档仍无法阻止 `F-027` rewrite、officialization creep、或 `F-014` rewrite。
- **Stop rule**:
  - 一旦讨论开始滑向实现细节、Windows、officialization、broader docs parity、callback 默认 gate，立即停包。

## PKT-030-B：DingTalk packaged closure implementation

- **Goal**: 只收口直接服务 DingTalk packaged closure 的 implementation gap，使 DingTalk 达到 “ready for fresh live verification” 或形成 clear blocker / decision。
- **What B is allowed to touch**:
  - 直接影响 packaged DingTalk support promise、install flow、Dashboard read-back、packaged lifecycle、artifact generation 的 source surfaces；
  - 直接定义 packaged DingTalk promise 的 release wording；
  - 仅在必要时 recut packaged candidate lineage。
- **What B must not do**:
  - 不给 DingTalk `PASS`；
  - 不把 root launcher reachability、`/api/status`、`/dashboard` 可达单独记成 closure；
  - 不把 DingTalk optional `corpId` / `robotCode` 反写成 blocking gate；
  - 不顺手改 officialization、WeCom 主链、Windows、或全仓 cleanup。
- **Suggested read-set**:
  - `specs/024-unified-channel-contract-baseline/*`
  - `specs/025-channel-replay-doc-parity/replay-truth-inventory.md`
  - `specs/027-mac-ui-first-release-readiness/*`
  - 当前 Commander 指定 packaged candidate root 及其 docs / wrappers / UI surface
  - `ui/server.mjs`
  - `ui/public/index.html`
  - `ui/public/dashboard.html`
  - `ui/public/channel-helpers.js`
  - `ui/lib/channel-canonical.mjs`
- **Probable write-set families**:
  - `ui/server.mjs`
  - `ui/public/index.html`
  - `ui/public/dashboard.html`
  - `ui/public/channel-helpers.js`
  - `ui/lib/channel-canonical.mjs`
  - packaged-facing docs source surfaces that define DingTalk support wording
  - packaged artifact generation surfaces for the Mac handoff cut
- **DONE when**:
  - DingTalk packaged closure gap 已被压缩到 live verification 所需的真实输入 / fresh evidence；
  - 或者形成 clear `BLOCKED / DECISION REQUIRED`，且归因不混入 WeCom / officialization / Windows。
- **BLOCKED when**:
  - 缺少 Commander 指定的真实输入 route；
  - gap 本质落在 officialization、Windows、或 broader cleanup。
- **Stop rule**:
  - 一旦任务开始靠 Feishu PASS、parser-only success、status/dashboard reachability 伪造 DingTalk closure，立即停包。

## PKT-030-C：WeCom packaged closure implementation

- **Goal**: 只收口直接服务 WeCom packaged closure 的 implementation gap，使 WeCom 达到 “ready for fresh live verification” 或形成 clear blocker / decision。
- **What C must inherit**:
  - true `F-014` 的 bot-first 长连接主链；
  - `Bot ID + Secret` 最小真实入口；
  - callback / 自建应用 enhancement 不是默认 gate。
- **What C is allowed to touch**:
  - 直接影响 packaged WeCom bot-first install / update / read-back / lifecycle 的 source surfaces；
  - 直接影响 packaged runtime-plugin pairing 的 build / packaging surfaces；
  - 直接定义 packaged WeCom support wording 的 release surfaces。
- **What C must not do**:
  - 不给 WeCom `PASS`；
  - 不把 bounded probe、existing config readable、或 UI 可见字段写成 packaged ready；
  - 不把 callback 写成默认 blocking gate；
  - 不把 packaged gap 反写成 true `F-014` fail。
- **Suggested read-set**:
  - `specs/011-wecom-channel-integration/spec.md`
  - `docs/runbooks/F-014-wecom-channel-integration.md`
  - `specs/024-unified-channel-contract-baseline/*`
  - `specs/025-channel-replay-doc-parity/replay-truth-inventory.md`
  - `specs/027-mac-ui-first-release-readiness/*`
  - 当前 Commander 指定 packaged candidate root 及其 docs / wrappers / UI surface / plugins / runtime
  - `ui/server.mjs`
  - `ui/lib/wecom.mjs`
  - `ui/public/index.html`
  - `ui/public/dashboard.html`
- **Probable write-set families**:
  - `ui/server.mjs`
  - `ui/lib/wecom.mjs`
  - `ui/public/index.html`
  - `ui/public/dashboard.html`
  - packaged-facing docs source surfaces that define WeCom packaged promise
  - plugin / runtime packaging or handoff build surfaces
- **DONE when**:
  - WeCom packaged gap 已被压缩到 live verification 所需的真实输入 / fresh evidence；
  - 或者形成 clear `BLOCKED / DECISION REQUIRED / EVIDENCE GAP`，且归因不混入 officialization / Windows。
- **BLOCKED when**:
  - runtime-plugin pairing 本质仍未闭合；
  - 没有 Commander 冻结的 real-input route；
  - 继续推进会改写 true `F-014` floor。
- **Stop rule**:
  - 一旦 C 开始把 callback 升格成默认 gate、把 bounded probe 写成 ready、或把 packaged gap 写成 `F-014` failure，立即停包。

## PKT-030-D：fresh live verification-only

- **Goal**: 在 Commander 指定的 packaged candidate lineage 上，用 fresh live evidence分别给 DingTalk 与 WeCom 出 verdict。
- **D is verification-only**:
  - 不补实现；
  - 不修 docs；
  - 不重切 feature；
  - 只验证 packaged candidate、真实输入 route、post-install status / dashboard / lifecycle、以及 channel-specific pass floor。
- **Required evidence posture**:
  - DingTalk：live install 或 Commander-accepted real state activation + post-install status + dashboard + lifecycle；
  - WeCom：不低于 true `F-014` floor 的 packaged bot-first evidence；
  - 两个 channel 都不得用 source tree、旧 candidate、bounded probe、或 dashboard readable 代替。
- **Allowed write-set**:
  - 默认 repo write-set 为空；
  - 若 Commander 需要 repo 内 evidence note，只能额外指定 `specs/030-packaged-dingtalk-wecom-support-closure/` 下的 note 文件。
- **DONE when**:
  - verifier 对 DingTalk / WeCom 分别给出 `PASS / BLOCKED / DECISION REQUIRED / EVIDENCE GAP`；
  - verifier 清楚说明哪些事实被 fresh packaged evidence 支撑，哪些没有。
- **BLOCKED when**:
  - 缺少真实输入 route；
  - packaged candidate lineage 不明确；
  - 需要新实现才能继续。
- **Stop rule**:
  - 一旦验证过程开始顺手修实现、改 wording、改 packaging，立即停在验证失败 / blocker。

## PKT-030-E：facts-only closeout / longrun writeback

- **Goal**: 只把 `D` 已证实的 per-channel packaged facts 写回长期记忆层。
- **What E can do**:
  - 更新 `feature_list.json`、`claude-progress.txt` 等长期事实面；
  - 只搬运 `D` 已证实的事实。
- **What E must not do**:
  - 不制造新 authority；
  - 不补实现；
  - 不修改 `F-025-B` / true `F-014` / `F-026` / `F-027` 冻结结论；
  - 不靠 closeout 把一个 channel 的 PASS 借给另一个 channel。
- **DONE when**:
  - longrun 只反映 `D` 已证实的 facts；
  - feature-level state 与 per-channel verdict 一致。
- **BLOCKED when**:
  - `D` 仍是 `BLOCKED / DECISION REQUIRED / EVIDENCE GAP`；
  - 需要 closeout 反向发明新结论才写得下去。

## Commander next-step framing

推荐的 dispatch 节奏：

1. 先让 `SpecReviewer` 过 `SPEC-030-R1`；
2. 由 Commander 自己或 spec-author 完成 `PKT-030-A` wording freeze；
3. 默认先开 `PKT-030-B`，再开 `PKT-030-C`；
4. 只有在 `B/C` 各自把 gap 收敛到真实输入与 live verification 时，才开 `PKT-030-D`；
5. `PKT-030-E` 继续留到 `D` 之后，不能提前。
