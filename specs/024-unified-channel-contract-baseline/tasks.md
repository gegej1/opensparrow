# Tasks: Unified Channel Contract Baseline

**Feature ID**: `F-024`  
**Input**: `specs/024-unified-channel-contract-baseline/spec.md`, `specs/024-unified-channel-contract-baseline/plan.md`  
**Dispatch rule**: 坚持 `contract-first`、`minimum viable convergence`、`packetized rollout`。F-024 只做 baseline；`F-025` 才处理 replay / docs parity。禁止任何“顺便统一全部 UI / docs / replay / dynamic form engine”的任务扩张。

## 派工前统一约束

- 先读：`AGENTS.md`、`docs/governance/framework-stack.md`、`docs/runbooks/F-019-commander-orchestration-governance.md`
- 任何 worker 只能改自己 packet 的 write-set，不能跨包顺手扩张
- 先冻结 `PKT-024-A`，后续包才能开工
- `PKT-024-B` 必须先于 `PKT-024-C`
- `PKT-024-D` 必须在 `PKT-024-B` 与 `PKT-024-C` 全部冻结后启动
- `PKT-024-E` 只作为 verification-only closure packet 启动，不承担新的实现写面
- 所有完成声明都要带 fresh verification evidence

---

## PKT-024-A：contract baseline 冻结

### T024-A1 — 固化 shared core / delta / baggage 总表
- **Recommended owner**: `claudecodeA`
- **Goal**: 把三家 channel 的 shared core、delta、requiredness、historical baggage 固化成单一 truth table，并冻结 `ChannelCanonicalInputV1` 的 shared core / delta 槽位。
- **Write-set**:
  - `specs/024-unified-channel-contract-baseline/spec.md`
  - `specs/024-unified-channel-contract-baseline/plan.md`
  - `specs/024-unified-channel-contract-baseline/tasks.md`
- **Read-set**:
  - `ui/public/index.html`
  - `ui/public/dashboard.html`
  - `ui/server.mjs`
  - `ui/lib/wecom.mjs`
  - `ui/public/wecom-helpers.js`
  - `specs/004-dingtalk-stream-win-parity/spec.md`
  - `specs/011-wecom-channel-integration/spec.md`
- **Steps**:
  1. 定义 `ChannelCanonicalInputV1` 的 shared core 与 delta 槽位，明确 literal field name 不强制统一。
  2. 产出三家 channel 的 field inventory truth table，覆盖 install required、enhanced optional、advanced optional、alias / baggage。
  3. 明确 DingTalk `corpId` 是 optional metadata、WeCom 保留 nested persistence、Feishu 只做 minimal baseline 且不新增 live 字段。
- **Checks**:
  - 人工对照代码确认没有把 DingTalk `corpId` 误写为 install required。
  - 人工对照 WeCom 现状确认没有把 nested persistence 错改成 flat persisted schema。
  - 人工对照 Feishu 现状确认没有平白加出新字段，只冻结 helper / validation gap。
  - 人工对照边界确认 `spec.md` / `plan.md` / `tasks.md` 仍明确：F-024 只做 baseline，F-025 才做 replay / docs parity。
- **Done when**:
  - Commander 可以直接拿这张总表给实现 worker 派工。
- **Stop if**:
  - 任务开始演变成 UI 重构、动态表单 schema 设计、replay 收口或 persisted schema 全迁移。

### T024-A2 — 补齐 install / dashboard / server / read-back mapping 表
- **Recommended owner**: `claudecodeA`
- **Goal**: 把每个 live field 到 canonical slot、persisted target、read-back rule、source family 的映射写清楚，并冻结 Install / Dashboard 共用同一 UI field model 的规则。
- **Write-set**:
  - `specs/024-unified-channel-contract-baseline/spec.md`
  - `specs/024-unified-channel-contract-baseline/plan.md`
  - `specs/024-unified-channel-contract-baseline/tasks.md`
- **Read-set**:
  - `ui/public/index.html`
  - `ui/public/dashboard.html`
  - `ui/server.mjs`
  - `ui/lib/wecom.mjs`
  - `ui/public/wecom-helpers.js`
- **Steps**:
  1. 分 Feishu / DingTalk / WeCom 写出 mapping table，至少覆盖 Install binding、Dashboard binding、canonical slot、persisted target、read-back rule。
  2. 标明哪些字段来自 config，哪些来自 `ui-meta` enrichment，哪些属于 server-owned defaults。
  3. 把 Install / Dashboard / server / read-back 的字段闭环写成 Commander 可直接派工的 closure table。
- **Checks**:
  - table 中每个字段都能在当前代码里找到对应路径或逻辑证据。
  - Install / Dashboard / server / read-back 之间的映射闭环，不再需要二次猜字段去向。
- **Done when**:
  - worker 无需二次猜测每个字段到底写去哪里，Commander 可以直接按表拆包。
- **Stop if**:
  - 开始把 persisted config schema、动态表单、E2E 或 replay 收口纳入本包。

### T024-A3 — Commander 审批 F-024 / F-025 边界
- **Recommended owner**: `Commander`
- **Goal**: 正式冻结“F-024 只做 baseline，F-025 再做 replay / docs parity”的边界。
- **Write-set**:
  - `specs/024-unified-channel-contract-baseline/plan.md`
  - `specs/024-unified-channel-contract-baseline/tasks.md`
- **Read-set**:
  - `specs/024-unified-channel-contract-baseline/spec.md`
- **Steps**:
  1. 审核所有 in-scope / out-of-scope 是否与研究结论一致。
  2. 确认没有任何 packet 偷带真实 E2E、Windows replay 全量收口、动态表单引擎。
- **Checks**:
  - 逐条核对 spec 的 Non-goals。
- **Done when**:
  - Commander 明确允许 `PKT-024-B` / `PKT-024-C` 开工。
- **Stop if**:
  - 边界尚未冻结却有人想先改代码。

---

## PKT-024-B：server canonical handling

### T024-B1 — 建立 shared server canonical entry
- **Recommended owner**: `codexA`
- **Goal**: 为 Feishu / DingTalk / WeCom 建立统一的 server canonical handling 入口，使 `/api/install` 与 `/api/config/channels` 不再各自手写 requiredness。
- **Write-set**:
  - `ui/server.mjs`
  - `ui/lib/`
- **Read-set**:
  - `specs/024-unified-channel-contract-baseline/spec.md`
  - `ui/server.mjs`
  - `ui/lib/wecom.mjs`
- **Steps**:
  1. 抽象 shared canonical normalize / validate / persist / enrich dispatcher。
  2. 保持 WeCom 现有分层可复用，不推倒重写。
  3. 让 install 与 config update 两条入口共享同一 canonical rule。
- **Checks**:
  - `node --check ui/server.mjs`
  - `node --test` 覆盖 canonical dispatcher 与 per-channel helpers。
- **Done when**:
  - 服务端存在唯一 authoritative canonical entry，而不是多处重复 requiredness。
- **Stop if**:
  - 需要修改 vendor / upstream plugin 才能继续。

### T024-B2 — 收敛 DingTalk canonical rule
- **Recommended owner**: `codexA`
- **Goal**: 明确 DingTalk 的 core 为 `clientId + clientSecret`，`corpId` 为 optional metadata，`robotCode` 为 alias / display baggage。
- **Write-set**:
  - `ui/server.mjs`
  - `ui/lib/`
- **Read-set**:
  - `specs/004-dingtalk-stream-win-parity/spec.md`
  - `specs/024-unified-channel-contract-baseline/spec.md`
- **Steps**:
  1. 统一接受 `clientId/appKey/robotCode`、`clientSecret/appSecret`、`corpId/cropId` 的历史 alias。
  2. canonicalize 到 shared core + DingTalk delta。
  3. 保持 `ui-meta` read-back enrichment，但不把 `corpId` 恢复为 browser 硬性必填。
- **Checks**:
  - DingTalk 缺 `corpId` 的 install / update 输入不再报错。
  - round-trip fixture 仍能回显 `corpId/robotCode`。
- **Done when**:
  - browser/backend/spec 三方对 DingTalk requiredness 不再漂移。
- **Stop if**:
  - 任务开始顺带改 probe、session webhook、runtime patch 逻辑。

### T024-B3 — 让 Feishu 接到同层级 canonical boundary
- **Recommended owner**: `codexA`
- **Goal**: Feishu 继续保持最小字段面，但拥有与 DingTalk / WeCom 同层级的 server canonical normalizer / validator，而不再只是页面字段 + 服务端硬写默认值的特例。
- **Write-set**:
  - `ui/server.mjs`
  - `ui/lib/`
- **Read-set**:
  - `ui/server.mjs`
  - `specs/024-unified-channel-contract-baseline/spec.md`
- **Steps**:
  1. 为 Feishu 增加 canonical normalize / validate entry。
  2. 保留 server-owned defaults，不新增用户字段。
  3. 让 install / dashboard / read-back 均服从同一 minimal contract。
- **Checks**:
  - Feishu helper tests / canonical tests 通过。
- **Done when**:
  - Feishu 不再是 shared helper / canonical pipeline 之外的例外。
- **Stop if**:
  - 为 Feishu 扩出本轮不需要的新字段或高级设置。

### T024-B4 — 保持 WeCom bot-first + nested persistence
- **Recommended owner**: `codexA`
- **Goal**: 把 WeCom 接入 shared canonical pipeline，但不破坏它现有 bot-first core 和 nested persistence。
- **Write-set**:
  - `ui/server.mjs`
  - `ui/lib/wecom.mjs`
  - `ui/lib/wecom.test.mjs`
- **Read-set**:
  - `specs/011-wecom-channel-integration/spec.md`
  - `specs/024-unified-channel-contract-baseline/spec.md`
- **Steps**:
  1. 保留 `botId + secret` 为 shared core 映射。
  2. 保留 agent / callback 作为 delta，并继续写入 nested persisted paths。
  3. 维持扁平 read-back 给 UI，而不是把 UI 改成直接吃 nested config。
- **Checks**:
  - WeCom canonical round-trip tests 通过。
- **Done when**:
  - WeCom 成为 shared pipeline 参考实现，而不是被错误削平成旧教程模型。
- **Stop if**:
  - 任务开始全面迁移 WeCom persisted schema。

---

## PKT-024-C：shared frontend helper baseline

### T024-C1 — 建立 shared browser helper entry points
- **Recommended owner**: `codexB`
- **Goal**: 给三家 channel 提供统一的浏览器 helper 入口，至少覆盖 normalize / validate / payload build。
- **Write-set**:
  - `ui/public/`
- **Read-set**:
  - `specs/024-unified-channel-contract-baseline/spec.md`
  - `ui/public/wecom-helpers.js`
  - `ui/server.mjs`
- **Steps**:
  1. 定义 shared helper API，而不是继续让每页各写一套 requiredness。
  2. 兼容现有 WeCom helper，避免大规模 rename churn。
  3. 为 Feishu / DingTalk 提供同层级 helper entry。
- **Checks**:
  - 浏览器 helper tests 覆盖三家 channel。
- **Done when**:
  - shared helper baseline 已存在，WeCom 不再是唯一有 helper 的 channel。
- **Stop if**:
  - helper 设计开始上升到动态表单引擎。

### T024-C2 — Install 页切到 shared helper
- **Recommended owner**: `codexB`
- **Goal**: 安装页使用 shared helper 完成 preflight validation 与 payload build，尤其去掉 DingTalk `corpId` 的硬性校验。
- **Write-set**:
  - `ui/public/index.html`
  - `ui/public/*.js`
- **Read-set**:
  - `specs/024-unified-channel-contract-baseline/spec.md`
  - `ui/public/index.html`
- **Steps**:
  1. 把 DingTalk / WeCom / Feishu 的 payload build 收敛到 helper。
  2. 保持页面 UI 结构不重写。
  3. 校验错误文案与 server contract 一致。
- **Checks**:
  - 抽取脚本后 `node --check` 通过。
  - DingTalk 缺 `corpId` 不再被安装页前置拦截。
- **Done when**:
  - 安装页不再自持一套与 server 漂移的 contract 规则。
- **Stop if**:
  - 任务开始演变成安装页重构。

### T024-C3 — Dashboard 页切到 shared helper
- **Recommended owner**: `codexB`
- **Goal**: Dashboard modal 使用与安装页同一套 helper 入口，避免 channel settings 再次复制老 requiredness。
- **Write-set**:
  - `ui/public/dashboard.html`
  - `ui/public/*.js`
- **Read-set**:
  - `specs/024-unified-channel-contract-baseline/spec.md`
  - `ui/public/dashboard.html`
  - `ui/server.mjs`
- **Steps**:
  1. 把 saveChannelConfig 的 channel-specific preflight 收敛到 helper。
  2. 让 summary / load / save 都服从 canonical field model。
  3. 保持 read-back 到卡片字段的语义不变。
- **Checks**:
  - 抽取脚本后 `node --check` 通过。
  - Dashboard 对 DingTalk 不再要求 `corpId`。
- **Done when**:
  - Install 与 Dashboard 对同一 channel 不再各自拥有不同 requiredness。
- **Stop if**:
  - 需要全面重做 Dashboard 卡片或表单布局。

---

## PKT-024-D：最小 docs / live-spec / tutorial / runbook wording sync

### T024-D1 — 同步 live-spec / plan / tasks wording
- **Recommended owner**: `claudecodeB`
- **Goal**: 只在 contract 已冻结后，最小同步 `spec.md` / `plan.md` / `tasks.md` 中与 packet 边界、字段口径直接相关的 wording。
- **Write-set**:
  - `specs/024-unified-channel-contract-baseline/spec.md`
  - `specs/024-unified-channel-contract-baseline/plan.md`
  - `specs/024-unified-channel-contract-baseline/tasks.md`
- **Read-set**:
  - `specs/024-unified-channel-contract-baseline/spec.md`
  - `specs/024-unified-channel-contract-baseline/plan.md`
  - `specs/024-unified-channel-contract-baseline/tasks.md`
  - `ui/server.mjs`
  - `ui/public/index.html`
  - `ui/public/dashboard.html`
- **Steps**:
  1. 仅同步已经在 `PKT-024-B` 与 `PKT-024-C` 冻结下来的 canonical wording，包括 DingTalk `clientId + clientSecret` core / `corpId` optional metadata、WeCom `botId + secret` core + nested persistence、Feishu `appId + appSecret` minimal baseline。
  2. 清理 design 文档中任何仍暗示 `PKT-024-D` 可提前并行、拥有测试写面，或把 Dashboard 写成“添加渠道 / 保存并启用”的表述。
  3. 保持 packet 顺序仍为 `PKT-024-A -> PKT-024-B -> PKT-024-C -> PKT-024-D -> PKT-024-E`。
- **Checks**:
  - 人工核对 `PKT-024-D` 不拥有 `ui/lib/` 或 `ui/public/` 邻近测试写面。
  - 人工核对 live-spec wording 已把 Dashboard 固定为三张卡片 + modal 保存 + enable toggle。
- **Done when**:
  - F-024 设计文档中的 dispatch isolation wording 与 reviewer 收敛口径一致。
- **Stop if**:
  - 开始借机重开 contract 设计或扩大 F-024 scope。

### T024-D2 — 更新最小直接影响 docs / runbook
- **Recommended owner**: `claudecodeB`
- **Goal**: 只同步 F-024 直接影响到的 tutorial / SOP / runbook wording，不做全 docs 清洗。
- **Write-set**:
  - `docs/tutorials/01-安装教程.md`
  - `docs/usb-pack/SOP.md`
  - `docs/usb-pack/windows-native-delivery.md`
  - `docs/runbooks/F-024-unified-channel-contract-baseline.md`
- **Read-set**:
  - `specs/024-unified-channel-contract-baseline/spec.md`
  - `specs/004-dingtalk-stream-win-parity/spec.md`
  - `specs/011-wecom-channel-integration/spec.md`
- **Dependency gate**:
  - `PKT-024-B` 已冻结
  - `PKT-024-C` 已冻结
- **Steps**:
  1. 修正 DingTalk `corpId` 必填的直接受影响表述，并把 `clientId + clientSecret` 写回 core。
  2. 修正 WeCom 被误写成旧式主模型的直接受影响表述，明确 `botId + secret` 为 core、nested persistence 继续保留。
  3. 修正直接受影响教程中仍把 Dashboard 写成“添加渠道 / 保存并启用”的旧交互表述。
  4. 记录 F-024 与 F-025 的 docs boundary。
- **Checks**:
  - 搜索结果中不再出现直接冲突表述。
  - 直接受影响文档不再把当前 Dashboard 写成动态添加渠道流程。
- **Done when**:
  - 直接受影响文档与 canonical contract 同口径。
  - 直接受影响文档明确 `F-024` 只收 contract baseline，replay / broader docs parity 留给 `F-025`。
- **Stop if**:
  - 开始扩张到不受本轮直接影响的历史文档。

---

## PKT-024-E：integration cutover closure / verification-only

### T024-E1 — 做 install / dashboard / read-back 三面对齐验证
- **Recommended owner**: `codexC`
- **Goal**: 作为 closure / verification-only packet，验证 install、dashboard save、config read-back 已切换到同一 baseline，杜绝半切换。
- **Write-set**:
  - 无默认 repo write-set（verification-only）
- **Read-set**:
  - `ui/public/index.html`
  - `ui/public/dashboard.html`
  - `ui/server.mjs`
  - `docs/runbooks/F-024-unified-channel-contract-baseline.md`
- **Steps**:
  1. 逐家 channel 跑 cross-surface verification，覆盖 install payload → persist mapping → read-back。
  2. 逐家检查 requiredness 与 alias 行为是否在两个 UI surface 上一致。
  3. 将 round-trip closure evidence 返回给 Commander 作为 acceptance gate 输入。
- **Checks**:
  - `node --check ui/server.mjs`
  - `node --test` 覆盖 round-trip / smoke fixtures。
- **Done when**:
  - Commander 拿到足够证据关掉 F-024，而无需声称真实 E2E 已完成。
- **Stop if**:
  - 验证中发现缺陷时，立即停止并由 Commander 新开 fix packet；`PKT-024-E` 不得自行顺手补实现。
  - 验证开始依赖真实外部凭据或 Windows 全量 replay。

### T024-E2 — 做 integration acceptance gate
- **Recommended owner**: `Commander`
- **Goal**: 基于 `PKT-024-E1` 的验证证据做 pass/fail gate；若发现问题，明确回退到新的 fix packet，而不是让 `PKT-024-E` 转成实现包。
- **Write-set**:
  - 无默认 repo write-set（verification-only）
- **Read-set**:
  - `specs/024-unified-channel-contract-baseline/spec.md`
  - `specs/024-unified-channel-contract-baseline/plan.md`
  - `specs/024-unified-channel-contract-baseline/tasks.md`
  - `docs/runbooks/F-024-unified-channel-contract-baseline.md`
- **Steps**:
  1. 确认 F-024 只关 baseline，不偷带 replay parity。
  2. 若验证通过，则关掉 F-024 的 baseline acceptance gate。
  3. 若验证失败，则新开 fix packet；更广 replay / docs parity 工作留给 `F-025`。
- **Checks**:
  - closure 说明里明确列出未做项：真实 E2E、Windows replay fidelity、全 docs parity。
- **Done when**:
  - `PKT-024-E` 保持为 closure / verification-only packet，没有被扩张成实现包。
- **Stop if**:
  - 关包动作开始含糊其辞地声称“统一收口已全部完成”。
