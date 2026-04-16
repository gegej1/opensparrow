# Feature Specification: Unified Channel Contract Baseline

**Feature ID**: `F-024`  
**Feature Branch**: `024-unified-channel-contract-baseline`  
**Created**: 2026-04-14  
**Status**: In Progress  
**Input**: 基于已完成 research，为 Feishu / DingTalk / WeCom 的“统一收口”定义第一战正式设计。本轮只做 contract-first 设计，不做三家 channel 重写，不做动态表单引擎，不改 vendor / runtime / upstream 插件。

## Context & References

### 仓库约束
- `AGENTS.md`
- `docs/governance/framework-stack.md`
- `longrun/workspaces/opensparrow-unified/feature_list.json`
- `longrun/workspaces/opensparrow-unified/claude-progress.txt`

### 当前活跃代码 / 历史 spec
- `ui/public/index.html`
- `ui/public/dashboard.html`
- `ui/server.mjs`
- `ui/lib/wecom.mjs`
- `ui/public/wecom-helpers.js`
- `specs/011-wecom-channel-integration/spec.md`
- `specs/004-dingtalk-stream-win-parity/spec.md`

### 已吸收的研究结论
- Feishu：最稳，但 helper / validation 边界最薄；安装页与 dashboard 字段简单，服务端固定写共同 policy。
- DingTalk：是研究起点里最乱的一家；browser 曾把 `corpId` 当必填，但后端真实 canonical contract 已更接近 `clientId + clientSecret` 为 core，且存在 alias、ui-meta、read-back enrichment。
- WeCom：结构最清晰；已有独立 frontend helper + server normalizer / validator / enricher / probe；但 docs / replay 仍漂。
- 推荐切入顺序不是先做 frontend helpers，而是：`contract` → `server normalization/validation` → `frontend helpers` → `docs/tests/replay`。
- 研究建议拆为两战：
  - `F-024 = unified-channel-contract-baseline`
  - `F-025 = channel-replay-doc-parity`

## 为什么做 F-024

当前问题不是“三个 channel 缺功能”，而是三者已经在跑的 UI / API / config surface 没有统一 contract，导致同一个渠道在不同入口、不同文档、不同 read-back 结果里呈现出不一致的口径。

### 重点矛盾
1. **DingTalk 的 browser / backend / spec 已漂移**
   - 在 F-024 启动前，安装页与 Dashboard 都把 `corpId` 视为硬性必填。
   - 服务端 `normalizeDingtalkCredentials()` 已把 `clientId/clientSecret` 视为最小可运行 core，并接受 `appKey/appSecret/robotCode/cropId` 等历史 alias。
   - read-back 还会通过 `ui-meta.json` 补回 `corpId/robotCode`，说明 live contract 与 persisted config contract 已不在同一层。
2. **Feishu 缺少与另外两家同等级的 helper / validation 边界**
   - Feishu 当前能跑，但更多依赖页面内联字段和服务端固定写 policy。
   - 一旦开始做跨 channel 收口，Feishu 如果继续没有最小 helper / canonical entry，就会成为“看起来简单、实际例外最多”的新漂移源。
3. **WeCom 已结构化，但还没有成为共享 contract 的参考基线**
   - WeCom 已经具备 normalizer / validator / enricher / probe 的层次。
   - 但它目前只是“企微自己比较干净”，还没有把这套分层推广为 Feishu / DingTalk / WeCom 共同遵守的 baseline。

## Scope

### In Scope
1. 定义 `shared core fields`、`per-channel delta fields`、`historical alias / baggage` 的 contract 分类。
2. 定义 install form / dashboard form / server canonical handling / persisted config read-back 的统一映射关系。
3. 定义服务端 canonical contract 的 authoritative 责任边界：normalize、validate、persist、read-back enrichment。
4. 决定 shared frontend helper 是否进入第一战，以及仅进入到什么程度。
5. 规定本轮必须同步的最小 docs/tests 范围。
6. 形成可派工的 packetized rollout，供 Commander 按包推进。

### Out of Scope
- 真实凭据 E2E。
- `vendor/`、runtime、插件 upstream 改动。
- Windows replay fidelity 的全量收口。
- Dashboard 全量重做。
- 动态表单引擎。
- WeCom nested persistence 的全面迁移。
- 全 docs 大扫除。
- 把三家 channel 强行压成同一组 literal field names。

## 当前漂移面的统一抽象

F-024 只统一三层，不引入第四层抽象：

1. **UI Field Model**
   - 安装页与 Dashboard 面向用户展示的字段模型。
   - 要求：同一 channel 在两个 UI surface 上的字段分组、必填性、错误文案语义一致。
2. **Canonical Channel Contract**
   - 浏览器提交到服务端、以及服务端内部 normalize / validate / persist / enrich 所依据的统一语义层。
   - 这是 F-024 的主目标，也是 shared core 真正落点。
3. **Persisted Config + Read-back Enrichment**
   - OpenClaw `config`、`ui-meta.json`、以及 read-back 对 UI 的补足层。
   - F-024 不重写 persisted schema，只要求它服从 canonical contract。

## Canonical Channel Contract v1

F-024 不要求三家共用同一组 literal 字段名；它要求三家先共用同一组**语义槽位**。本轮冻结以下 server-side canonical shape 作为 contract baseline：

```text
ChannelCanonicalInputV1 {
  type: 'feishu' | 'dingtalk' | 'wecom'
  enabled: boolean
  core: {
    primaryId: string
    primarySecret: string
  }
  delta: {
    tenantId?: string
    displayCode?: string
    agentSecret?: string
    agentId?: string
    replyFormat?: 'markdown' | 'text'
    callbackToken?: string
    encodingAESKey?: string
    callbackPath?: string
  }
}
```

说明：
- `core.primaryId` / `core.primarySecret` 是三家都存在的最小可运行凭据槽位。
- `delta.*` 是 channel-specific slot bag，不表示每个 channel 都必须拥有这些字段。
- `tenantId` 是语义字段，不要求 UI literal name 一律改成 `tenantId`；DingTalk / WeCom 仍可在 UI 上保留 `corpId`。
- `displayCode` 只用于 DingTalk 这类需要 read-back / 兼容补值的 display alias，不是新的共享必填。
- WeCom 的 nested persistence 仍保留在 persisted config 层，不要求本轮扁平化改写。

## Shared Core vs Delta

### Shared Core Fields

| Canonical slot | 含义 | Feishu | DingTalk | WeCom |
| --- | --- | --- | --- | --- |
| `type` | 渠道类型 | `feishu` | `dingtalk` | `wecom` |
| `enabled` | 渠道开关 | Dashboard 管理 | Dashboard 管理 | Dashboard 管理 |
| `core.primaryId` | 最小可运行的主凭据标识 | `appId` | `clientId` | `botId` |
| `core.primarySecret` | 最小可运行的主凭据密钥 | `appSecret` | `clientSecret` | `secret` |

### Feishu-specific Delta

Feishu 在 F-024 中**不新增用户可编辑 delta 字段**。它的差异主要体现在 server-owned defaults，而不是 live contract 扩面：

| 类别 | 字段 | F-024 定位 |
| --- | --- | --- |
| Server-owned defaults | `connectionMode=websocket`、`domain=feishu`、`dmPolicy=open`、`allowFrom=["*"]`、`requireMention=false` | 由服务端固定写入，不进入 shared frontend helper 的可编辑范围 |
| Helper baseline gap | 最小 normalize / validate 边界 | 需要补到与 DingTalk / WeCom 同层级，但不做高级配置扩面 |

### DingTalk-specific Delta

| Canonical slot | 当前 UI / 历史字段 | 分类 | F-024 口径 |
| --- | --- | --- | --- |
| `delta.tenantId` | `corpId` / `cropId` | Enhanced optional | 可收集、可 read-back、可写入 `ui-meta`；**不是 install blocker** |
| `delta.displayCode` | `robotCode` | Alias / baggage | 输入可接受，read-back 可补回；若缺省则可由 `clientId` 派生 |

### WeCom-specific Delta

| Canonical slot | 当前 UI 字段 | 分类 | F-024 口径 |
| --- | --- | --- | --- |
| `delta.tenantId` | `corpId` | Enhanced optional | 仅在“自建应用增强出站”路径下参与成组校验 |
| `delta.agentSecret` | `corpSecret` | Enhanced optional | 与 `corpId + agentId` 成组出现 |
| `delta.agentId` | `agentId` | Enhanced optional | 与 `corpId + corpSecret` 成组出现 |
| `delta.replyFormat` | `replyFormat` | Enhanced optional | 仅在 agent path 启用时生效 |
| `delta.callbackToken` | `callbackToken` | Advanced optional | 回调入站字段，依赖完整 agent path |
| `delta.encodingAESKey` | `encodingAESKey` | Advanced optional | 同上 |
| `delta.callbackPath` | `callbackPath` | Advanced optional | 同上 |

## Install Required / Enhanced Optional / Advanced Optional / Baggage

| Channel | Install required | Enhanced optional | Advanced optional | Alias / historical baggage to converge |
| --- | --- | --- | --- | --- |
| Feishu | `appId`、`appSecret` | 无 | 无 | 不新增 live delta；真正的缺口是 helper / validation baseline 仍偏薄 |
| DingTalk | `clientId`、`clientSecret`（接受 `appKey/appSecret/robotCode` alias 输入） | `corpId` | 无 | `corpId` 是 optional metadata；`robotCode` 是 display / alias baggage，不是 core credential |
| WeCom | `botId`、`secret` | `corpId`、`corpSecret`、`agentId`、`replyFormat` | `callbackToken`、`encodingAESKey`、`callbackPath` | flat live fields 与 nested `agent.* / agent.callback.*` persisted shape 并存 |

### Shared Core / Delta / Baggage 总表（单一真源）

| Channel | Live field / accepted alias | Canonical slot | 分类 | Persist family | Read-back family | Baseline note |
| --- | --- | --- | --- | --- | --- | --- |
| Feishu | `appId` | `core.primaryId` | Install required | `channels.feishu.appId` | config direct | Install / Dashboard 使用同一字段名，不新增别名槽位 |
| Feishu | `appSecret` | `core.primarySecret` | Install required | `channels.feishu.appSecret` | config direct | F-024 不新增用户可编辑 delta 字段 |
| DingTalk | `clientId` / `appKey` / `robotCode`（alias 输入） | `core.primaryId` | Install required | `channels.dingtalk.clientId` | config direct | core credential 仍是 `clientId + clientSecret` |
| DingTalk | `clientSecret` / `appSecret` | `core.primarySecret` | Install required | `channels.dingtalk.clientSecret` | config direct | `appSecret` 仅是 alias，不改变 requiredness |
| DingTalk | `robotCode` | `delta.displayCode` | Alias / baggage | `channels.dingtalk.robotCode`，并可复制到 `ui-meta.dingtalk.robotCode` | config + `ui-meta` enrichment | display alias / read-back alias，不是 install blocker |
| DingTalk | `corpId` / `cropId` | `delta.tenantId` | Enhanced optional | `ui-meta.dingtalk.corpId`（baseline writer）；legacy `channels.dingtalk.corpId/cropId` 只读兼容 | `channelCfg.corpId ?? channelCfg.cropId ?? ui-meta.dingtalk.corpId` | optional metadata，不得写回 install required |
| WeCom | `botId` | `core.primaryId` | Install required | `channels.wecom.botId` | config → `enrichWecomChannelForUi()` flatten | bot-first core 保持不变 |
| WeCom | `secret` | `core.primarySecret` | Install required | `channels.wecom.secret` | config → `enrichWecomChannelForUi()` flatten | 与 `botId` 组成最小可运行凭据 |
| WeCom | `corpId` | `delta.tenantId` | Enhanced optional | `channels.wecom.agent.corpId` | nested config → flatten | 仅在 agent path 启用时参与成组校验 |
| WeCom | `corpSecret` | `delta.agentSecret` | Enhanced optional | `channels.wecom.agent.corpSecret` | nested config → flatten | 与 `corpId + agentId` 成组出现 |
| WeCom | `agentId` | `delta.agentId` | Enhanced optional | `channels.wecom.agent.agentId` | nested config → flatten | 维持扁平 UI / nested persist 的分层 |
| WeCom | `replyFormat` | `delta.replyFormat` | Enhanced optional | `channels.wecom.agent.replyFormat` | nested config → flatten | 仅在 agent path 启用时生效 |
| WeCom | `callbackToken` | `delta.callbackToken` | Advanced optional | `channels.wecom.agent.callback.token` | nested `agent.callback.*` / tolerated root `callback.*` → flatten | 回调入站字段，依赖完整 agent path |
| WeCom | `encodingAESKey` | `delta.encodingAESKey` | Advanced optional | `channels.wecom.agent.callback.encodingAESKey` | nested `agent.callback.*` / tolerated root `callback.*` → flatten | 同上 |
| WeCom | `callbackPath` | `delta.callbackPath` | Advanced optional | `channels.wecom.agent.callback.path` | nested `agent.callback.*` / tolerated root `callback.*` → flatten | 同上 |

关键约束：
- **DingTalk 的 `corpId` 是 optional metadata，不是 core credential。**
- **WeCom 不回退到老教程里的 `corpid/agent/secret` 简化模型，nested persistence 继续保留。**
- **Feishu 只做 minimal baseline，不新增用户可编辑 delta 字段，也不能以其简单性为理由削平 DingTalk / WeCom 的 delta。**
- **Install 与 Dashboard 必须使用同一 channel UI field model：字段集合、requiredness tier、alias acceptance 一致；允许 copy / layout 不同，不允许 contract 不同。**

## Install / Dashboard / Server / Read-back Mapping Closure

> 这张表不是要求三家 literal 字段名统一，而是把每个 live field 在 Install、Dashboard、server canonical handling、persisted target、read-back enrichment 之间的闭环关系写死，供后续实现 worker 直接对表施工。

### Feishu

| Live field | Install binding / payload | Dashboard binding / payload | Canonical slot | Persisted target | Read-back rule | Source family |
| --- | --- | --- | --- | --- | --- | --- |
| `appId` | `credentials.feishu.appId -> channels[].appId` | `modal.fields.appId -> POST /api/config/channels { appId }` | `core.primaryId` | `channels.feishu.appId` | `GET /api/config*` 直接回显 `appId` | config |
| `appSecret` | `credentials.feishu.appSecret -> channels[].appSecret` | `modal.fields.appSecret -> POST /api/config/channels { appSecret }` | `core.primarySecret` | `channels.feishu.appSecret` | `GET /api/config*` 直接回显 `appSecret` | config |

Feishu 备注：`connectionMode=websocket`、`domain=feishu`、`dmPolicy=open`、`allowFrom=["*"]`、`requireMention=false` 继续由 server `configureChannel('feishu')` 固定写入；它们是 server-owned defaults，不进入 live UI field model。

### DingTalk

| Live field | Install binding / payload | Dashboard binding / payload | Canonical slot | Persisted target | Read-back rule | Source family |
| --- | --- | --- | --- | --- | --- | --- |
| `clientId` | `credentials.dingtalk.clientId -> channels[].clientId = clientId || robotCode` | `modal.fields.clientId -> POST body.clientId = clientId || robotCode` | `core.primaryId` | `channels.dingtalk.clientId` | `GET /api/config/channels` 后直接回显到 `ch.clientId` | config |
| `robotCode` | `credentials.dingtalk.robotCode -> channels[].robotCode = robotCode || clientId` | `modal.fields.robotCode -> POST body.robotCode = robotCode || clientId` | `delta.displayCode` | `channels.dingtalk.robotCode`，并可复制到 `ui-meta.dingtalk.robotCode` | `enrichDingtalkChannelForUi()` 返回 `robotCode ?? ui-meta.robotCode ?? clientId` | config + `ui-meta` enrichment |
| `clientSecret` | `credentials.dingtalk.clientSecret -> channels[].clientSecret` | `modal.fields.clientSecret -> POST body.clientSecret` | `core.primarySecret` | `channels.dingtalk.clientSecret` | `GET /api/config*` 直接回显 `clientSecret` | config |
| `corpId` | `credentials.dingtalk.corpId -> channels[].corpId` | `modal.fields.corpId -> POST body.corpId` | `delta.tenantId` | `ui-meta.dingtalk.corpId`（baseline writer） | `enrichDingtalkChannelForUi()` 读取 `channelCfg.corpId/cropId`，否则回退 `ui-meta.dingtalk.corpId` | `ui-meta` enrichment + legacy config tolerance |

DingTalk 备注：F-024 基线下，Install 与 Dashboard 都以同一 requiredness tier 处理钉钉字段：`clientId + clientSecret` 为 core，`corpId` 仅是 optional metadata，不再作为 browser 前置必填。

### WeCom

| Live field | Install binding / payload | Dashboard binding / payload | Canonical slot | Persisted target | Read-back rule | Source family |
| --- | --- | --- | --- | --- | --- | --- |
| `botId` | `credentials.wecom.botId -> validateWecomFields(...).botId` | `modal.fields.botId -> validateWecomFields(...).botId` | `core.primaryId` | `channels.wecom.botId` | `normalizeWecomCredentials()` + `enrichWecomChannelForUi()` 扁平回显 | config |
| `secret` | `credentials.wecom.secret -> validateWecomFields(...).secret` | `modal.fields.secret -> validateWecomFields(...).secret` | `core.primarySecret` | `channels.wecom.secret` | `normalizeWecomCredentials()` + `enrichWecomChannelForUi()` 扁平回显 | config |
| `corpId` | `credentials.wecom.corpId -> validateWecomFields(...).corpId` | `modal.fields.corpId -> validateWecomFields(...).corpId` | `delta.tenantId` | `channels.wecom.agent.corpId` | nested `agent.corpId` 读回后扁平到 `corpId` | nested config → flat UI |
| `corpSecret` | `credentials.wecom.corpSecret -> validateWecomFields(...).corpSecret` | `modal.fields.corpSecret -> validateWecomFields(...).corpSecret` | `delta.agentSecret` | `channels.wecom.agent.corpSecret` | nested `agent.corpSecret` 读回后扁平到 `corpSecret` | nested config → flat UI |
| `agentId` | `credentials.wecom.agentId -> validateWecomFields(...).agentId` | `modal.fields.agentId -> validateWecomFields(...).agentId` | `delta.agentId` | `channels.wecom.agent.agentId` | nested `agent.agentId` 读回后扁平到 `agentId` | nested config → flat UI |
| `replyFormat` | `credentials.wecom.replyFormat -> validateWecomFields(...).replyFormat` | `modal.fields.replyFormat -> validateWecomFields(...).replyFormat` | `delta.replyFormat` | `channels.wecom.agent.replyFormat` | nested `agent.replyFormat` 读回后扁平到 `replyFormat` | nested config → flat UI |
| `callbackToken` | `credentials.wecom.callbackToken -> validateWecomFields(...).callbackToken` | `modal.fields.callbackToken -> validateWecomFields(...).callbackToken` | `delta.callbackToken` | `channels.wecom.agent.callback.token` | `normalizeWecomCredentials()` 接受 `agent.callback.token`，并容忍 root `callback.token` 旧形状后扁平回显 | nested config → flat UI |
| `encodingAESKey` | `credentials.wecom.encodingAESKey -> validateWecomFields(...).encodingAESKey` | `modal.fields.encodingAESKey -> validateWecomFields(...).encodingAESKey` | `delta.encodingAESKey` | `channels.wecom.agent.callback.encodingAESKey` | `normalizeWecomCredentials()` 接受 `agent.callback.encodingAESKey`，并容忍 root `callback.encodingAESKey` 旧形状后扁平回显 | nested config → flat UI |
| `callbackPath` | `credentials.wecom.callbackPath -> validateWecomFields(...).callbackPath` | `modal.fields.callbackPath -> validateWecomFields(...).callbackPath` | `delta.callbackPath` | `channels.wecom.agent.callback.path` | `normalizeWecomCredentials()` 接受 `agent.callback.path`，并容忍 root `callback.path` 旧形状后扁平回显 | nested config → flat UI |

WeCom 备注：Install 与 Dashboard 都必须继续使用这套 flat live field model；persisted schema 仍以 nested `agent.* / agent.callback.*` 为准，不把 UI 直接改成 nested config 编辑器。

Dashboard 备注：F-024 基线保持固定三张渠道卡片（Feishu / DingTalk / WeCom）+ `编辑` modal + channel `enabled` toggle；不把当前 surface 写回成通用“添加渠道 / 保存并启用”的动态流程。

## Validation / Normalization / Read-back Enrichment 的责任边界

| 层 | 必须负责 | 不负责 |
| --- | --- | --- |
| Install / Dashboard 页面 | trim、alias 级别的轻量 normalize；用户友好的 preflight error；构造 canonical payload | 决定 authoritative requiredness；直接依赖 persisted config shape；私自扩大字段范围 |
| Shared frontend helper | 统一 Feishu / DingTalk / WeCom 的 payload build / preflight validate / basic alias map 接口 | 动态表单渲染；页面布局统一；替代服务端 validator |
| Server canonical handling | authoritative normalize、validate、persist mapping、read-back enrichment；兼容历史 alias | 把 raw config shape 直接暴露给前端；继续容忍 UI 比服务端更严格 |
| Docs / tests | 同步 contract truth、最小 fixture / unit / smoke 范围 | 冒充真实凭据 E2E；一口气收完 replay / docs 全债 |

## Shared Frontend Helper 是否进入第一战

**进入，但只进入最小基线，不进入动态引擎层。**

F-024 对 shared frontend helper 的要求是：
1. 让 Feishu / DingTalk / WeCom 至少在**同一层级**上拥有：
   - `normalizeUiFields(type, raw)`
   - `validateUiFields(type, raw)`
   - `buildChannelPayload(type, raw)`
2. Install 页与 Dashboard 页调用同一套 helper entry points，避免 DingTalk requiredness 在两页继续手写漂移。
3. 允许保留 channel-specific 文案和 UI 布局；**不要求**把三家表单渲染成一个配置驱动引擎。
4. WeCom 现有 helper 不是被推倒重来，而是被提升为 shared helper baseline 的参考实现。

## 第一刀应该落在哪一层

### 推荐顺序
1. **先落 shared schema / contract**
   - 没有 contract 表，后续 server / frontend / docs 只会继续各自漂移。
2. **紧跟 server normalization / validation / read-back enrichment**
   - 这是 authoritative source of truth，优先级高于 frontend helper。
   - 原因：DingTalk 当前最核心的问题就在 server 已经更接近真实 contract，但 browser 与 spec 没跟上。
3. **再做 shared frontend helper baseline**
   - helper 的任务是消费已冻结的 canonical contract，不是先发明 contract。
4. **最后补最小 docs/tests**
   - 同战必须补：contract matrix、server canonical tests、shared helper tests、最小用户文档修正。
   - 留给 `F-025`：真实 replay parity、Windows replay fidelity 扩面、docs 全量清扫、真实凭据 E2E 证据。

## User Stories & Testing

### User Story 1 - 安装页、Dashboard、服务端必须共享同一语义 contract（Priority: P1)

作为维护者，我希望同一渠道在 install / dashboard / server 三个入口上遵守同一套 requiredness 与 alias 规则，这样不会出现浏览器拦住、服务端却允许，或服务端 read-back 与 UI 字段组不一致的情况。

**Independent Test**: contract matrix + targeted round-trip fixtures 能同时证明 install payload、dashboard payload、server canonical handling、read-back enrichment 的语义一致。

### User Story 2 - 服务端必须成为 canonical handling 的唯一真源（Priority: P1)

作为后续执行 F-024 的实现者，我希望 `normalize / validate / persist / enrich` 被收敛为服务端统一入口，这样 DingTalk / WeCom 的历史 alias 和 read-back 不会继续散落在页面逻辑与文档口径里。

**Independent Test**: 对 Feishu / DingTalk / WeCom 各跑一组 canonical contract tests，验证 normalize、group validation、persist mapping、read-back enrichment。

### User Story 3 - shared frontend helper 只做到 minimum viable convergence（Priority: P1)

作为前端维护者，我希望 Install 与 Dashboard 至少共用同一套 helper entry points，而不是继续在两个 HTML 页面里复制 DingTalk / WeCom 的字段校验，但我不希望本轮演变成 UI 全量重写或动态表单引擎。

**Independent Test**: 浏览器 helper tests 覆盖三家 channel 的 payload build 与 preflight validate，且页面仍保持现有结构。

### User Story 4 - docs / tests 只同步最小直接影响范围（Priority: P2)

作为 Commander，我希望 F-024 把 contract 直接影响到的 docs / tests 补齐，但不把本轮扩张成“顺便把 replay / docs 全洗一遍”。

**Independent Test**: 最小 docs 清单完成同步，且没有任何文档宣称“真实凭据 E2E 已完成”或“Windows replay fidelity 已全收口”。

## Functional Requirements

- **FR-001**: 必须定义 `ChannelCanonicalInputV1`，并把 shared core 与 delta 分类明确写入 spec。
- **FR-002**: Install form 与 Dashboard form 对同一 channel 的字段必填性、alias 接受范围、错误语义必须一致。
- **FR-003**: 服务端必须成为 Feishu / DingTalk / WeCom 的 authoritative normalize / validate / persist / read-back enrichment 真源。
- **FR-004**: DingTalk 的最小可运行 core 必须定义为 `clientId + clientSecret`；`corpId` 仅作为 optional metadata 收口。
- **FR-005**: WeCom 的最小可运行 core 必须保持 `botId + secret`；增强出站与回调入站保持为 delta，而不是回退到旧式 `corpid/agent/secret` 主模型。
- **FR-006**: Feishu 必须获得与另外两家同层级的最小 helper / validation 边界，避免继续成为“只靠页面内联 + 服务端硬写”的例外。
- **FR-007**: shared frontend helper 可以进入 F-024，但只能覆盖 payload build / preflight validation / alias normalization，不得扩展为动态表单引擎。
- **FR-008**: F-024 必须定义 install form / dashboard form / server config / read-back enrichment 的统一映射表。
- **FR-009**: 本轮 docs/tests 只同步 contract 直接影响范围，不伪造真实凭据 E2E 或 replay parity 已完成。
- **FR-010**: `F-025` 必须被预留为 replay / docs parity 的下一战，而不是挤进 F-024。

## Non-Goals

- **NG-001**: 不在本轮重写 Feishu / DingTalk / WeCom 三个 channel 的全部运行时代码。
- **NG-002**: 不在本轮实现动态表单引擎。
- **NG-003**: 不在本轮修改 vendor / runtime / upstream plugin。
- **NG-004**: 不在本轮做真实凭据 E2E 或 Windows replay 全量收口。
- **NG-005**: 不在本轮全面迁移 WeCom nested persistence。
- **NG-006**: 不在本轮重做 Dashboard UI、扩展为动态添加/删除渠道流程，或做全 docs 大扫除。

## Success Criteria

- **SC-001**: `specs/024-unified-channel-contract-baseline/` 下存在完整的 `spec.md`、`plan.md`、`tasks.md`，并明确 shared core / delta / alias / mapping / stop rules。
- **SC-002**: F-024 实施后，Install 与 Dashboard 对 DingTalk 不再把 `corpId` 当作硬性必填。
- **SC-003**: F-024 实施后，`/api/install` 与 `/api/config/channels` 对三家 channel 使用同一套 canonical normalize / validate 规则。
- **SC-004**: F-024 实施后，WeCom read-back 继续保持 bot-first UI 语义，同时保留 nested persistence。
- **SC-005**: F-024 实施后，Feishu / DingTalk / WeCom 都具备同层级的 frontend helper + server canonical handling 边界。
- **SC-006**: F-024 只同步最小 docs/tests 范围，不对真实 E2E、Windows replay、全 docs parity 作超范围承诺。
- **SC-007**: `F-025` 被明确预留为紧随其后的 replay / docs parity 战役。
