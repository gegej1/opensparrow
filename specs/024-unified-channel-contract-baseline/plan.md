# Commander Plan: Unified Channel Contract Baseline

**Feature ID**: `F-024`  
**Feature Branch**: `024-unified-channel-contract-baseline`  
**Date**: 2026-04-14  
**Spec**: `specs/024-unified-channel-contract-baseline/spec.md`

## 战役摘要

F-024 不是“重做三家 channel”，而是把 Feishu / DingTalk / WeCom 已经活跃的 install / dashboard / server config contract 先收成同一套 baseline。推荐顺序必须保持：

1. 先冻结 shared core / delta / alias contract；
2. 再把 server-side canonical handling 收成唯一真源；
3. 再补 shared frontend helper baseline；
4. 再做最小 docs / live-spec / tutorial / runbook wording sync；
5. 最后做一次显式 integration cutover 验证。

### 为什么额外拆出 integration packet

建议在 `PKT-024-D` 之外再单列一个 `PKT-024-E`，原因不是扩大范围，而是**避免半切换**：
- `PKT-024-B` 会动 server contract；
- `PKT-024-C` 会动 install / dashboard 的 helper 调用；
- 如果没有独立 integration cutover，最容易出现“服务端已改、某一页 UI 还没跟上”的 split-brain。

## Packet 顺序与依赖

- `PKT-024-A` 是整战入口，必须先完成并获 Commander 签字。
- `PKT-024-B` 只能在 `PKT-024-A` 完成后启动。
- `PKT-024-C` 只能在 `PKT-024-B` 冻结 canonical contract 后启动。
- `PKT-024-D` 必须在 `PKT-024-B` 与 `PKT-024-C` 全部冻结后启动，不允许在 `PKT-024-A` 后提前并行。
- `PKT-024-E` 只能在 `PKT-024-D` 完成后启动，并作为 verification-only closure packet 执行 integration acceptance gate。

---

## PKT-024-A：shared core / per-channel delta / alias 收敛表

- **Goal**: 产出两张 Commander 可直接派工的 baseline 文档：`shared core / delta / baggage` 总表，以及 `install / dashboard / server / read-back` mapping closure table。
- **Scope**:
  - 冻结 `ChannelCanonicalInputV1`
  - 明确 `shared core`、`delta`、`install required`、`enhanced optional`、`advanced optional`
  - 明确 DingTalk `corpId`、WeCom nested persistence、Feishu minimal baseline 的边界
  - 冻结 Install 与 Dashboard 必须共用同一 UI field model 的规则
  - 形成 implementation-facing mapping table，并标注 config / `ui-meta` / server-owned default 的归属
- **Non-goals**:
  - 不改运行时代码
  - 不新增动态表单 schema
  - 不做 replay / E2E
  - 不把 F-025 的 replay / docs parity 提前并入 F-024
- **Owner**: `claudecodeA`
- **Reviewer**: `Commander`
- **Verifier**: `codexC`
- **Closer**: `Commander`
- **Write-set**:
  - `specs/024-unified-channel-contract-baseline/spec.md`
  - `specs/024-unified-channel-contract-baseline/plan.md`
  - `specs/024-unified-channel-contract-baseline/tasks.md`
- **Read-set**:
  - `AGENTS.md`
  - `docs/governance/framework-stack.md`
  - `longrun/workspaces/opensparrow-unified/feature_list.json`
  - `longrun/workspaces/opensparrow-unified/claude-progress.txt`
  - `ui/public/index.html`
  - `ui/public/dashboard.html`
  - `ui/server.mjs`
  - `ui/lib/wecom.mjs`
  - `ui/public/wecom-helpers.js`
  - `specs/011-wecom-channel-integration/spec.md`
  - `specs/004-dingtalk-stream-win-parity/spec.md`
- **Required checks**:
  - 人工对照 `ui/public/index.html`、`ui/public/dashboard.html`、`ui/server.mjs`，确认没有把 DingTalk `corpId` 误写回 install required
  - 人工对照 `ui/lib/wecom.mjs` 与 `ui/server.mjs`，确认 WeCom persisted target 仍是 nested `agent.* / agent.callback.*`，没有被写成 flat schema
  - 人工对照 Feishu 当前表单与 server 写入逻辑，确认 baseline 只冻结最小 helper / validation 边界，不新增 live 字段
  - 人工对照 mapping table，确认每个 live field 都能闭环到 Install / Dashboard / server / read-back 证据
  - 人工检查 `spec.md` / `plan.md` / `tasks.md` 仍明确：F-024 只做 baseline，F-025 才做 replay / docs parity
- **Acceptance signals**:
  - Commander 能直接引用 contract table 与 mapping table 给 worker 派工
  - 三家 channel 的 required / optional / baggage 分类不再模糊
  - Install / Dashboard / server / read-back 映射闭环，不再需要二次猜测字段去向
  - spec 明确把 `F-025` 留作 replay / docs parity
- **Stop rule**:
  - 如果讨论开始演变成“统一 literal 字段名”“统一 UI 表单引擎”或“顺便做 replay 收口”，立即停止并回到 F-024 边界

## PKT-024-B：server install / config update / config read-back canonical contract

- **Goal**: 让服务端成为唯一 authoritative canonical handling 层，统一 `/api/install`、`/api/config/channels`、`/api/config` / `/api/config/channels` read-back enrichment。
- **Scope**:
  - 统一 Feishu / DingTalk / WeCom 的 normalize / validate / persist mapping / read-back enrichment 入口
  - 保持 DingTalk alias 兼容与 `ui-meta` read-back
  - 保持 WeCom bot-first core + nested persistence
  - 把 Feishu 提升到同层级 canonical entry
- **Non-goals**:
  - 不改 probe 语义与 runtime 行为
  - 不动 vendor / upstream plugin
  - 不做真实凭据 E2E
- **Owner**: `codexA`
- **Reviewer**: `Commander`
- **Verifier**: `codexC`
- **Closer**: `Commander`
- **Write-set**:
  - `ui/server.mjs`
  - `ui/lib/`
- **Read-set**:
  - `specs/024-unified-channel-contract-baseline/spec.md`
  - `ui/server.mjs`
  - `ui/lib/wecom.mjs`
  - `specs/004-dingtalk-stream-win-parity/spec.md`
  - `specs/011-wecom-channel-integration/spec.md`
- **Required checks**:
  - `node --check ui/server.mjs`
  - `node --test` 覆盖 channel canonical helpers / round-trip fixtures
  - 定向验证 DingTalk 缺 `corpId` 时 install / update 不报输入错误
- **Acceptance signals**:
  - `/api/install` 与 `/api/config/channels` 接受同一套 canonical requiredness
  - DingTalk `corpId` 降为 optional metadata
  - WeCom read-back 继续扁平给 UI，但 persisted config 不被错误改平
  - Feishu 拥有独立 canonical normalizer / validator 边界
- **Stop rule**:
  - 如果要通过修改 vendor / plugin upstream 才能继续，立即停止并升级为新 feature

## PKT-024-C：shared frontend helper baseline

- **Goal**: 在不重做 UI 的前提下，让 Install 与 Dashboard 共用同一套 channel helper 入口，至少让 Feishu / DingTalk / WeCom 处于同一层级。
- **Scope**:
  - 统一 `normalizeUiFields(type, raw)`
  - 统一 `validateUiFields(type, raw)`
  - 统一 `buildChannelPayload(type, raw)`
  - 两个页面切换到 shared helper entry points
- **Non-goals**:
  - 不做动态表单引擎
  - 不重写页面布局 / 样式 / 文案结构
  - 不把所有 channel form 抽成一个 schema renderer
- **Owner**: `codexB`
- **Reviewer**: `Commander`
- **Verifier**: `codexC`
- **Closer**: `Commander`
- **Write-set**:
  - `ui/public/index.html`
  - `ui/public/dashboard.html`
  - `ui/public/`
- **Read-set**:
  - `specs/024-unified-channel-contract-baseline/spec.md`
  - `ui/public/index.html`
  - `ui/public/dashboard.html`
  - `ui/public/wecom-helpers.js`
  - `ui/server.mjs`
- **Required checks**:
  - 对 browser helpers 跑定向测试
  - 对从 HTML 中抽出的脚本做 `node --check` 或等价语法校验
  - 定向验证 DingTalk 在 browser preflight 中不再硬性要求 `corpId`
- **Acceptance signals**:
  - Install 与 Dashboard 使用同一套 helper entry points
  - Feishu / DingTalk / WeCom 都不再靠各自页面里的独立 requiredness 分叉
  - 页面结构基本不变，只收敛 contract handling
- **Stop rule**:
  - 如果 helper 方案开始要求重构整个 Dashboard 或引入表单引擎，立即停止并移出 F-024

## PKT-024-D：最小 docs / live-spec / tutorial / runbook wording sync

- **Goal**: 只同步 contract 直接影响的 docs、live-spec、tutorial、runbook wording；F-024 只收 contract baseline，不扩大成“全 docs / replay 收口”。
- **Scope**:
  - 更新最小用户文档与 runbook 口径
  - 必要时同步 `spec.md` / `plan.md` / `tasks.md` 的 wording 与 packet 边界
  - 保证 tutorial / SOP / runbook 的 contract 口径与 canonical baseline 一致
  - 把 Dashboard 表述固定为三张渠道卡片 + `编辑` modal 保存 + `enabled` toggle，而不是“添加渠道 / 保存并启用”
- **Non-goals**:
  - 不拥有任何 server-side 或 browser-side 测试写面
  - 不做真实凭据 E2E 文档
  - 不做 Windows replay fidelity 全量补证
  - 不做全仓 docs 大扫除
- **Owner**: `claudecodeB`
- **Reviewer**: `Commander`
- **Verifier**: `codexC`
- **Closer**: `Commander`
- **Write-set**:
  - `specs/024-unified-channel-contract-baseline/spec.md`
  - `specs/024-unified-channel-contract-baseline/plan.md`
  - `specs/024-unified-channel-contract-baseline/tasks.md`
  - `docs/tutorials/01-安装教程.md`
  - `docs/usb-pack/SOP.md`
  - `docs/usb-pack/windows-native-delivery.md`
  - `docs/runbooks/F-024-unified-channel-contract-baseline.md`
- **Read-set**:
  - `specs/024-unified-channel-contract-baseline/spec.md`
  - `specs/004-dingtalk-stream-win-parity/spec.md`
  - `specs/011-wecom-channel-integration/spec.md`
  - 相关安装 / delivery 文档
- **Dependency gate**:
  - `PKT-024-B` 已冻结
  - `PKT-024-C` 已冻结
- **Required checks**:
  - 搜索并修正仍把 DingTalk `corpId` 说成必填的直接受影响文档
  - 搜索并修正把 WeCom 误写成旧式 `corpid/agent/secret` 主模型的直接受影响文档
  - 搜索并修正仍把 Dashboard 写成“添加渠道 / 保存并启用”的直接受影响文档
  - 确认任何文档都没有声称真实 E2E / replay parity 已在 F-024 完成
  - 确认 `PKT-024-D` 没有接管任何 `ui/lib/` 或 `ui/public/` 邻近测试修正
- **Acceptance signals**:
  - 直接受影响文档口径与 canonical contract 一致
  - `spec/plan/tasks` 与 tutorial / runbook / SOP 的 wording 一致
  - `PKT-024-D` 保持为纯 wording sync packet
  - 文档中明确 `F-024` 只收 contract baseline，replay / broader docs parity 留给 `F-025`
- **Stop rule**:
  - 如果有人试图把 server/browser 测试修正、longrun closeout 或 integration verification 塞回 `PKT-024-D`，立即停止并退回对应 packet

## PKT-024-E：integration cutover / round-trip closure

- **Goal**: 在 F-024 末尾显式验证 install form、dashboard save、server read-back 已切换到同一 contract baseline，避免半切换上线；本 packet 仅承担 closure / verification，不承担新的实现修正。
- **Scope**:
  - fixture / mocked route 级别的 install → persist → read-back round-trip
  - 检查三家 channel 的 requiredness 与 alias 行为一致
  - 收集最小 smoke evidence 供 Commander 关包
- **Non-goals**:
  - 不承担新的实现写面
  - 不修 server-side 或 browser-side tests
  - 不做真实凭据 E2E
  - 不做 Windows replay fidelity 全量收口
  - 不做 probe 行为重写
- **Owner**: `codexC`
- **Reviewer**: `Commander`
- **Verifier**: `Commander`
- **Closer**: `Commander`
- **Write-set**:
  - 无默认 repo write-set（verification-only packet）
- **Read-set**:
  - `ui/server.mjs`
  - `ui/public/index.html`
  - `ui/public/dashboard.html`
  - `docs/runbooks/F-024-unified-channel-contract-baseline.md`
- **Required checks**:
  - `node --check ui/server.mjs`
  - `node --test` 覆盖三家 channel 的 canonical round-trip fixtures
  - 至少一组针对 install / dashboard / read-back 的 targeted smoke
- **Acceptance signals**:
  - Commander 能拿到明确证据说明三条 surface 已同口径
  - 不存在“某一页仍要求 DingTalk `corpId`”或“某一路 read-back 仍回旧模型”的残留
  - F-024 可以在不宣称真实 E2E 的前提下关包
  - `PKT-024-E` 没有被扩张成实现包
- **Stop rule**:
  - 如果验证中发现缺陷，立即停止并由 Commander 新开 fix packet；`PKT-024-E` 不得自行顺手补实现
  - 如果需要真实外部凭据或 Windows 全量 replay 才能继续，立即停止并转入 `F-025`

## Commander 执行建议

### 第一刀
先执行 `PKT-024-A`。如果 `shared core / delta / alias / mapping` 还没冻结，就不要让任何实现 Agent 提前改 server 或 frontend helper。

### 第二刀
`PKT-024-B` 必须先于 `PKT-024-C`。原因不是“后端优先”的习惯，而是当前漂移根因主要在**server 已经更接近真实 contract，前端与 spec 没跟上**。

### 第三刀
`PKT-024-D` 只同步最小 docs / live-spec / tutorial / runbook wording，且必须在 `PKT-024-B` 与 `PKT-024-C` 冻结后启动；`PKT-024-E` 只负责 verification-only integration closure。这样可以明确把 `F-024` 和 `F-025` 的边界留清楚。

## F-025 预留建议

建议在 F-024 关包后，紧接着预留 `F-025 = channel-replay-doc-parity`，专门处理：
- replay 证据与 docs parity；
- Windows replay fidelity 的后续收口；
- 更广范围的教程 / runbook / handoff 文档统一；
- 必要时补真实凭据 E2E 证据。

F-024 不应背这些债，但必须为 F-025 留出干净接口与明确边界。
