# Feature Specification: Dashboard 模型智能路由配置入口

**Feature ID**: `F-031`  
**Feature Branch**: `031-dashboard-model-routing-ui`  
**Created**: 2026-04-17  
**Status**: Draft  
**Input**: 用户明确要求为 Dashboard 新增“动态智能路由配置入口”，作为独立 follow-up feature 落 spec；本轮只做 Dashboard 前端配置面与对应服务端配置接口设计，不做代码实现，不回写当前 `F-027` 最小代码闭环的 PASS 口径。

## Context & References

- `ui/public/dashboard.html`
- `ui/server.mjs`
- `specs/027-custom-model-routing-plugin/spec.md`
- `docs/runbooks/F-027-custom-model-routing-plugin.md`
- `scripts/model-routing/manage-custom-routing-plugin.mjs`
- `scripts/model-routing/custom-plugin/openclaw.plugin.json`
- `scripts/model-routing/lib/custom-plugin-routing.mjs`

## 一句话定义

`F-031 = 在 Dashboard 的现有 API 配置区下方新增“模型智能路由”配置面板，用独立的 /api/config/model-routing 契约管理“普通单模型 / 智能路由”两种模式，但不扩展到 Agent routing、OpenClaw core native routing、USB/F-028、或 vendor 修改。`

## 与现有 feature 的关系

### 与 `F-027` 的关系

- `F-027` 已冻结的是 **custom model routing plugin 最小代码闭环**：插件存在、可加载、可把主模型切到 `opensparrow-router/auto`、可按 tier 选上游模型。
- `F-031` 是 follow-up 的 **Dashboard 配置面 feature**，只解决“用户如何在 Dashboard 中安全、明确地配置这套能力”。
- `F-031` 不得把 `F-027` 的 PASS 口径改写成“整个模型路由能力全部完成”。
- `F-031` 依赖 `F-027` 已存在的 plugin/provider/config schema，但不接管 plugin install/runbook/demo feature 本身。

### 与其他边界的关系

- 不做 Agent routing。
- 不做 OpenClaw core native routing。
- 不做 USB / `F-028`。
- 不修改 `vendor/`。
- 不把现有 `POST /api/config/api` 挤成“大一统接口”。

## 1. 用户问题与目标

### 当前用户问题

当前 Dashboard 的 API 配置区只支持：

1. `Base URL`
2. `API Key`
3. 单个 `模型名称`

这导致模型智能路由虽然已经有 plugin 和脚本能力，但仍存在三个可用性缺口：

1. **缺少稳定的 Dashboard 入口**
   - 用户无法在现有配置面中明确打开 / 关闭模型智能路由。

2. **单模型与智能路由的职责混在一起**
   - 当前 API 配置区的“模型名称”字段默认是单模型思路，没有模式切换，也没有 tier 模型配置位。

3. **路由配置缺少明确的保存语义**
   - 用户看不出来何时只是保存单模型，何时会把主模型切到 `opensparrow-router/auto`。

### 本 feature 的目标

为 Dashboard 提供一个清晰、独立、可保存的“模型智能路由”配置面板：

- 放在现有 API 配置区下方；
- 继续复用现有 `Base URL / API Key` 作为唯一上游连接来源；
- 但只复用“最后一次成功保存的 API 配置”，不读取 API 面板尚未保存的草稿；
- 让用户在 “普通单模型” 和 “智能路由” 两种模式之间切换；
- 用独立接口处理模式、`singleModeDefaultModel`、tier 模型映射和 routing JSON；
- 明确提示“智能路由保存成功后，主模型已切到 `opensparrow-router/auto`”；
- 采用“结构硬校验，连通性不硬校验”的策略，避免把 4 模型 live probe 绑定到保存动作。

## 2. In Scope / Out of Scope

### In Scope

1. Dashboard 中新增“模型智能路由”面板，位置在现有 API 配置区下方。
2. 支持两种模式：
   - 普通单模型
   - 智能路由
3. 普通模式只配置 `singleModeDefaultModel`。
4. 智能路由模式必须配置：
   - `SIMPLE`
   - `MEDIUM`
   - `COMPLEX`
   - `REASONING`
   - `routing` 原始 JSON
5. 新增独立接口：
   - `GET /api/config/model-routing`
   - `POST /api/config/model-routing`
6. 保存成功后的 UI 成功提示、错误提示、结构校验规则和状态展示。
7. 明确“API 区负责上游连接；路由面板负责模式与路由配置”的边界。
8. 明确路由面板只读取“最后一次成功保存的 API 配置”，不读取 API 面板尚未保存的草稿。
9. 明确区分保存按钮禁用态、请求中的 loading/disabled 状态，以及点击后返回的后端错误态。

### Out of Scope

1. Agent routing。
2. OpenClaw core native routing。
3. USB / `F-028`。
4. `vendor/` 改动。
5. 4 个 tier 模型的 live curl/probe 硬校验。
6. plugin 安装器、双终端 demo、runbook 大改。
7. Dashboard 其它 tab 的结构重做。
8. API 面板未保存草稿自动透传到路由面板。
9. 把“保存成功”表述成“模型一定可用”。

## 3. 当前依赖与现有代码入口

### 前端现状

当前 `ui/public/dashboard.html` 中：

- API 配置位于 `activeTab === 'api'` 区块；
- 当前表单状态为 `apiForm: { baseUrl: '', apiKey: '', model: '' }`；
- `loadConfig()` 从 `GET /api/config` 中读取：
  - `models.providers.openai.baseUrl`
  - `models.providers.openai.models[0].id`
- `saveApiConfig()` 直接向 `POST /api/config/api` 提交 `baseUrl/apiKey/model`。

这意味着当前 Dashboard 把“上游连接”和“默认模型”都归在 API 面板里，没有智能路由的独立信息架构。

### 后端现状

当前 `ui/server.mjs` 中已经存在：

- `GET /api/config`
- `POST /api/config/api`
- `GET /api/config/channels`
- `POST /api/config/channels`

其中 `POST /api/config/api` 目前会同时处理：

- OpenAI provider `baseUrl`
- `auth-profiles.json` 中的 `apiKey`
- 单个默认模型写入

### 路由 plugin 现状

`F-027` 已经定义并落地了自定义 plugin：

- provider id: `opensparrow-router`
- 主模型目标：`opensparrow-router/auto`
- plugin config schema 支持：
  - `baseUrl`
  - `apiKey`
  - `tierModelMap`
  - `routing`

当前 plugin 的配置形态已经足够支撑 Dashboard UI，但还没有稳定的 Dashboard 配置入口。

## 4. UI 信息架构

## 4.1 顶层位置

- 不新增新的 Dashboard 顶级 tab。
- 不新增“路由管理”独立页面。
- 新面板直接放在现有 `API 配置` 区块下方，形成同一页中的两个子区：

1. **上游连接**
   - `Base URL`
   - `API Key`
   - 保存按钮

2. **模型智能路由**
   - 模式切换
   - `singleModeDefaultModel`
   - tier 模型映射
   - routing JSON 编辑器
   - 保存按钮

这保证用户仍把这里理解为“模型与 API 的统一配置区”，但职责边界更清楚。

## 4.2 面板结构

### A. 模式选择区

- 使用显式的二选一模式控件：
  - `普通单模型`
  - `智能路由`
- 模式切换只改变当前表单视图和待保存 payload，不自动读取 API 面板未保存草稿。

### B. 连接复用提示区

- 路由面板顶部显示只读提示：
  - 当前复用“上方 API 配置区最后一次成功保存的 `Base URL / API Key`”
  - 不再单独维护 router 上游凭据
- 同时显示结构前置状态：
  - `Base URL（已保存）已配置 / 未配置`
  - `API Key（已保存）已配置 / 未配置`
- 如果 API 区存在未保存改动，路由面板必须出现明确提示：
  - `当前智能路由仍使用上次已保存的 Base URL / API Key；上方有未保存改动`

### C. 普通模式内容

- 仅展示：
  - `singleModeDefaultModel`

### D. 智能路由模式内容

- 展示并要求填写：
  - `SIMPLE`
  - `MEDIUM`
  - `COMPLEX`
  - `REASONING`
  - `routing JSON`

### E. 智能路由结果提示区

- 在智能路由模式下，保存成功后显示明确提示：
  - `已保存模型智能路由配置，主模型已切换到 opensparrow-router/auto`

## 5. 交互与校验规则

## 5.1 模式切换规则

- 默认以服务端当前保存状态回填：
  - 如果当前主模型就是 `opensparrow-router/auto`，默认进入 `智能路由`
  - 否则默认进入 `普通单模型`

- 切换模式时：
  - 不立即保存；
  - 只切换表单显示；
  - 未保存前不改动后端状态。

- 同一页面会话内，模式切换不应清空已输入但尚未保存的字段。

- `singleModeDefaultModel` 是 **普通模式 owning 的字段**：
  - 仅在普通模式中展示、编辑、提交；
  - 智能路由模式保存 **不要求** 它；
  - 从智能路由切回普通模式时，允许恢复上次成功保存的 `singleModeDefaultModel`，同时保留本次会话中尚未保存的普通模式脏输入。

- 模式切换后的按钮语义：
  - 如果切换后当前模式表单有脏改动且结构合法，保存按钮允许点击；
  - 如果切换后当前模式表单结构非法，保存按钮保持禁用。

## 5.2 普通模式校验

普通模式保存前必须满足：

1. `Base URL` 已配置
2. `API Key` 已配置
3. `singleModeDefaultModel` 非空

不要求：

- 实时调用模型；
- 访问 OpenAI-compatible upstream；
- probe 当前 `singleModeDefaultModel` 是否真实可用。

补充说明：

- 这里的 `Base URL / API Key 已配置` 指的是“最后一次成功保存的 API 配置存在”，不是 API 面板当前草稿里临时输入了值。
- 如果 API 面板当前存在未保存改动，普通模式仍基于已保存配置做校验与保存提示，不自动消费草稿值。

## 5.3 智能路由模式校验

智能路由模式保存前必须满足：

1. `Base URL` 已配置
2. `API Key` 已配置
3. 四档模型全部非空：
   - `SIMPLE`
   - `MEDIUM`
   - `COMPLEX`
   - `REASONING`
4. `routing JSON` 是合法 JSON
5. `routing JSON` 顶层结构必须是对象

明确不要求：

- `singleModeDefaultModel`

不要求：

- 保存时对四个模型逐个做 curl/probe；
- 保存时要求四个模型都返回成功；
- 保存时做 live upstream 连通性硬校验。

### 明确的校验原则

本 feature 采用：

> **结构硬校验，连通性不硬校验**

也就是：

- 要检查字段是否齐、JSON 是否合法、必要依赖是否存在；
- 但**不做 4 模型 live probe 硬校验**。

## 6. 前后端数据契约

## 6.1 `GET /api/config/model-routing`

### 目的

为 Dashboard 路由面板提供单一读接口，不再让前端自己从多个配置源拼模式判断。

### 返回建议

```json
{
  "ok": true,
  "mode": "single",
  "connection": {
    "baseUrl": "https://api.openai.com/v1",
    "baseUrlConfigured": true,
    "apiKeyConfigured": true,
    "source": "last-saved-api-config"
  },
  "singleModeDefaultModel": "gpt-4o-mini",
  "tierModelMap": {
    "SIMPLE": "gemini-2.0-flash-ssvip",
    "MEDIUM": "kimi-k2-0711-preview",
    "COMPLEX": "deepseek-r1-250528",
    "REASONING": "deepseek-r1-250528"
  },
  "routing": {
    "classifierModel": "gpt-4.1-mini",
    "tiers": {}
  },
  "effectivePrimaryModel": "openai/gpt-4o-mini",
  "router": {
    "providerId": "opensparrow-router",
    "modelTarget": "opensparrow-router/auto",
    "configPresent": true
  }
}
```

### 语义说明

- `mode`
  - `single`
  - `smart`
- `connection.apiKeyConfigured`
  - 只返回布尔值，不回传明文 API Key
- `connection.source`
  - 固定表达“路由面板读取的是最后一次成功保存的 API 配置”
- `singleModeDefaultModel`
  - 路由面板 owning 的普通模式字段，只在普通模式下参与保存要求
  - 返回值表示“最近一次成功保存的普通模式值”，供从 `smart` 切回 `single` 时恢复
- `tierModelMap`
  - 智能路由模式的四档模型映射
- `routing`
  - 已解析后的对象；前端负责格式化成 JSON 文本编辑器内容
- `effectivePrimaryModel`
  - 当前实际主模型，供 UI 提示使用

## 6.2 `POST /api/config/model-routing`

### 目的

独立保存路由模式与模型配置，不与 `POST /api/config/api` 混写。

### 请求体

#### 普通模式

```json
{
  "mode": "single",
  "singleModeDefaultModel": "gpt-4o-mini"
}
```

#### 智能路由模式

```json
{
  "mode": "smart",
  "tierModelMap": {
    "SIMPLE": "gemini-2.0-flash-ssvip",
    "MEDIUM": "kimi-k2-0711-preview",
    "COMPLEX": "deepseek-r1-250528",
    "REASONING": "deepseek-r1-250528"
  },
  "routing": {
    "classifierModel": "gpt-4.1-mini",
    "tiers": {}
  }
}
```

### 校验责任

后端负责：

1. 校验 `mode` 是否合法；
2. 校验“最后一次成功保存的 API 配置”中是否已有 `Base URL / API Key`；
3. 在 `mode=single` 时校验 `singleModeDefaultModel`；
4. 在 `mode=smart` 时校验 `tierModelMap` 四档是否齐全；
5. 在 `mode=smart` 时校验 `routing` 是否为合法对象；
6. 在需要切到 `opensparrow-router/auto` 时，确认所需 plugin config 写入目标可用。

后端不负责：

- 读取 API 面板尚未保存的草稿；
- 在 `mode=smart` 时要求 `singleModeDefaultModel`；
- 把保存成功解释成模型 upstream 一定可用。

### 成功响应建议

#### 普通模式成功

```json
{
  "ok": true,
  "mode": "single",
  "effectivePrimaryModel": "openai/gpt-4o-mini",
  "message": "普通单模型配置已保存"
}
```

#### 智能路由成功

```json
{
  "ok": true,
  "mode": "smart",
  "effectivePrimaryModel": "opensparrow-router/auto",
  "message": "模型智能路由已保存，主模型已切换到 opensparrow-router/auto"
}
```

### 失败响应建议

```json
{
  "ok": false,
  "errors": [
    "请先在上方 API 配置区保存 Base URL",
    "routing JSON 必须为合法对象"
  ]
}
```

## 7. 保存语义

## 7.1 API 区的职责

`POST /api/config/api` 继续只负责：

- `Base URL`
- `API Key`

不再承担“路由模式”与“路由面板默认模型”的最终 authority。

## 7.2 路由面板的职责

`POST /api/config/model-routing` 负责：

- 当前模式：`single | smart`
- `singleModeDefaultModel`
- `tierModelMap`
- `routing`

## 7.3 普通模式保存语义

保存普通模式时：

1. 继续使用当前 **最后一次成功保存** 的 API 区 `Base URL / API Key`
2. 将主模型切回普通 OpenAI provider 模式
3. `effectivePrimaryModel` 指向 `openai/<singleModeDefaultModel>` 或等价主模型目标
4. 已存在的 `tierModelMap / routing` 可保留为“非激活配置”，不要求删除

这保证用户从智能路由切回普通模式时不会丢失原来的 tier 配置。

同时：

- `singleModeDefaultModel` 的最近一次成功保存值必须可被后续普通模式回填恢复；
- 智能路由模式保存不会覆盖“上次成功保存的 `singleModeDefaultModel`”。

## 7.4 智能路由保存语义

保存智能路由模式时：

1. 后端从当前 API 配置区读取 **最后一次成功保存** 的 `Base URL / API Key`
2. 将这两个值写入 `opensparrow-router` plugin 所需配置
3. 将 `tierModelMap / routing` 一并写入 plugin config
4. 将主模型自动切到 `opensparrow-router/auto`
5. 前端显示成功提示，明确说明主模型已切换

同时：

- 智能路由模式保存不要求 `singleModeDefaultModel`；
- 若 API 面板有未保存改动，智能路由仍继续使用上次成功保存的 `Base URL / API Key`，并在 UI 上保持明确提醒。

### 关键约束

UI 不再维护一套独立的 router 凭据输入框；  
但后端可以为了 plugin 运行需要，把现有 API 配置派生写入 plugin config。

这叫：

> **复用上游连接，不复用表单 ownership**

## 8. 错误态 / 成功态 / 禁用逻辑

## 8.1 禁用态（点击前）

以下情况保存按钮必须直接禁用：

1. 普通模式下 `singleModeDefaultModel` 为空。
2. 智能路由模式下任一 tier 模型为空。
3. 智能路由模式下 `routing JSON` 非法。
4. 智能路由模式下 `routing JSON` 解析后顶层不是对象。
5. 最后一次成功保存的 API 配置缺少 `Base URL`。
6. 最后一次成功保存的 API 配置缺少 `API Key`。
7. 当前没有脏改动。

补充约束：

- `routing JSON` 非法属于前端禁用态，不应等到点击后再交给后端报错；
- 模式切换后，只要当前表单有脏改动且结构合法，保存按钮允许点击；
- 如果最后一次成功保存的 API 配置缺少 `Base URL` 或 `API Key`，路由面板保存按钮禁用；
- 如果 API 面板只是有未保存草稿，但最后一次成功保存的 API 配置仍完整，路由面板不禁用，只提示“仍使用上次已保存 API 配置”。

## 8.2 请求中状态（loading / disabled）

保存请求发出后：

- 保存按钮进入 loading/disabled 状态；
- 禁止重复提交；
- 当前编辑内容保留在表单中；
- 若请求成功，再更新已保存态与 dirty 状态；
- 若请求失败，退出 loading/disabled，保留用户当前输入。

## 8.3 点击后返回的后端错误态

本段只覆盖“保存按钮本来可点击，但请求发出后仍可能失败”的后端错误。
前端在点击前即可确定的结构非法项，属于 `8.1 禁用态`，不属于正常 UI 主路径下的 `8.3`。

### 系统错误

- 后端配置写入失败
- 路由 plugin 配置目标不可写
- 切换主模型失败

UI 表现：

- 保持当前编辑内容不丢失；
- 不把失败误提示成已切换到 `opensparrow-router/auto`。

## 8.4 成功态

### 普通模式成功

- Toast：`普通单模型配置已保存`
- 面板状态：显示当前主模型为普通 openai provider 模型

### 智能路由成功

- Toast：`模型智能路由已保存`
- 明确的 secondary message / badge：
  - `主模型已切换到 opensparrow-router/auto`

### 可选的非阻塞提醒

在智能路由保存成功后，可以提示：

> `结构校验已通过；本次未执行四档模型 live probe。`

这有助于把“保存成功”与“所有模型一定都在线”区分开。

## 9. 验证边界

本 feature 的验证重点是：

1. Dashboard 信息架构是否清楚；
2. 表单 ownership 是否正确；
3. 独立接口是否清楚分离了 API 连接与路由配置；
4. 保存语义是否能在普通模式与智能路由模式之间稳定切换；
5. 错误提示与成功提示是否明确。

### 属于本 feature 的验证

- `GET /api/config/model-routing` 回填正确；
- `POST /api/config/model-routing` 结构校验正确；
- 智能路由保存后 UI 明确显示主模型已切到 `opensparrow-router/auto`；
- 普通模式保存后主模型回到单模型 provider；
- 切模式不丢失未保存表单输入；
- 路由 JSON 编辑器保持原始 JSON 全量暴露，不折叠隐藏。
- API 面板有未保存改动时，路由面板仍明确提示“继续使用上次已保存 API 配置”。

### 不属于本 feature 的验证

- 4 个 tier 模型逐个 live probe；
- 实际上游连通性探测；
- OpenClaw core routing 能力验证；
- Agent routing；
- plugin demo / dual-terminal runbook 回归；
- USB 打包链。

## 10. 明确不做 4 模型 live probe 硬校验

这是本 feature 的硬边界：

### 不做的事情

- 保存时不自动 curl `SIMPLE / MEDIUM / COMPLEX / REASONING`
- 保存时不阻塞等待 4 个模型都返回成功
- 保存时不以 live upstream 连通性作为表单通过条件

### 这样设计的原因

1. 这是 Dashboard 配置 UI feature，不是运行态健康探针 feature；
2. 4 模型 live probe 会显著放大保存延迟与失败面；
3. 很多错误属于环境连通性或供应商临时状态，不应阻断配置保存；
4. 当前目标是先把“模式与结构”配置面收口，而不是把 probe 系统混进这一轮。

### 结论

`F-031` 必须坚持：

> **结构硬校验，连通性不硬校验。**

## Functional Requirements

- **FR-001**: 系统 MUST 在 Dashboard 的现有 API 配置区下方新增“模型智能路由”面板。
- **FR-002**: 系统 MUST 支持 `普通单模型` 与 `智能路由` 两种模式。
- **FR-003**: API 区 MUST 继续只负责 `Base URL / API Key`。
- **FR-004**: 路由面板 MUST 负责 `mode / singleModeDefaultModel / tierModelMap / routing`。
- **FR-005**: 系统 MUST 通过独立接口 `GET/POST /api/config/model-routing` 管理路由配置。
- **FR-006**: 智能路由模式 MUST 要求四档模型齐全，并允许全量原始 `routing JSON` 编辑。
- **FR-007**: 智能路由保存成功后，系统 MUST 明确提示主模型已切换到 `opensparrow-router/auto`。
- **FR-008**: 系统 MUST 复用现有 `Base URL / API Key`，不得新增 router 专属凭据输入区。
- **FR-008-A**: 路由面板读取的连接状态 MUST 来自最后一次成功保存的 API 配置，而不是 API 面板未保存草稿。
- **FR-009**: 系统 MUST 采用“结构硬校验，连通性不硬校验”。
- **FR-010**: 系统 MUST NOT 在保存时做 4 模型 live probe 硬校验。
- **FR-011**: `singleModeDefaultModel` MUST 只属于普通模式；`mode=smart` 保存 MUST NOT 要求它。
- **FR-012**: 当 API 面板存在未保存改动时，路由面板 MUST 提示“当前智能路由仍使用上次已保存的 Base URL / API Key；上方有未保存改动”或等价语义。
- **FR-013**: 保存按钮 MUST 区分前端禁用态、请求中的 loading/disabled 状态、以及点击后返回的后端错误态。

## Success Criteria

- **SC-001**: 用户能在 Dashboard API 配置区下方看到独立的“模型智能路由”面板。
- **SC-002**: 用户能清楚区分“上游连接配置”和“路由模式配置”的职责。
- **SC-003**: 普通模式与智能路由模式的字段显示、校验与保存语义一致且无歧义。
- **SC-004**: 智能路由保存成功后，UI 能明确提示当前主模型已切到 `opensparrow-router/auto`。
- **SC-005**: 该 spec 明确限制了 Agent routing、OpenClaw core routing、USB/F-028、vendor 修改和 4 模型 live probe。
- **SC-006**: spec 明确写清 `singleModeDefaultModel` 只属于普通模式，且从 smart 切回 single 时可恢复上次成功保存值。
- **SC-007**: spec 明确写清路由面板只读取上次成功保存的 API 配置，并对 API 面板未保存改动给出清晰提示。
- **SC-008**: spec 明确区分保存按钮禁用态、请求中 disabled/loading 状态、以及点击后才出现的后端错误态。
