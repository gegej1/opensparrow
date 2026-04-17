# Dashboard 模型智能路由配置入口 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 Dashboard 的现有 API 配置区下方新增“模型智能路由”配置入口，并用独立的 `GET/POST /api/config/model-routing` 契约管理 `single | smart` 两种模式，而不扩张到 Agent routing、OpenClaw core routing、USB/F-028、或 `vendor/` 改动。

**Architecture:** 保持当前仓的单文件 Alpine Dashboard 与单文件 `ui/server.mjs` 主结构不变，只额外引入一个前端纯状态 helper 和一个后端配置 helper，把“表单 ownership / 结构校验 / profile config 读写语义”从页面与路由壳层剥离出来。后端继续复用最后一次成功保存的 API 配置作为 router config 的唯一上游来源；前端明确区分“API 面板草稿”与“路由面板读取的已保存连接状态”。

**Tech Stack:** `ui/public/dashboard.html` + Alpine.js、Node.js ESM、`ui/server.mjs` HTTP server、`node:test`、现有 `scripts/model-routing/lib/custom-plugin-routing.mjs` 常量与路由 plugin 配置语义。

---

## 1. Scope Locks

- 只做 Dashboard 中“模型智能路由”配置入口，不新增新的顶级 tab，不拆成独立页面。
- `POST /api/config/api` 保持 API 连接入口职责，只服务 `Base URL / API Key`；路由模式与模型 ownership 迁到 `GET/POST /api/config/model-routing`。
- `singleModeDefaultModel` 只属于普通模式；`smart` 保存不要求它，也不覆盖其最近一次成功保存值。
- `smart` 保存成功后必须把主模型切到 `opensparrow-router/auto`；`single` 保存成功后必须把主模型切回 `openai/<singleModeDefaultModel>` 或等价 primary target。
- 结构硬校验，连通性不硬校验；不做 4 档模型 live probe 作为保存门槛。
- 不做 Agent routing，不做 OpenClaw core native routing，不做 USB/F-028，不改 `vendor/`，也不借此把 `F-027` 改写成“全部完成”。

## 2. Current Code Reality

### 2.1 Frontend

- 当前 Dashboard 只有一个 `API 配置` 卡片，位于 [ui/public/dashboard.html](/Users/eduardogan/.config/superpowers/worktrees/opensparrow/feature-f-027-custom-routing-plugin/ui/public/dashboard.html)。
- 页面状态全部内联在 `dashboard()` Alpine 数据对象里，没有现成的前端测试入口。
- API 表单当前直接 owning `baseUrl / apiKey / model` 三个字段，和 F-031 的 ownership 要求冲突。

### 2.2 Backend

- 当前 HTTP 服务全部集中在 [ui/server.mjs](/Users/eduardogan/.config/superpowers/worktrees/opensparrow/feature-f-027-custom-routing-plugin/ui/server.mjs)。
- 已有 `GET /api/config`、`POST /api/config/api`、`GET/POST /api/config/channels`，但还没有独立的 model-routing 接口。
- `POST /api/config/api` 仍同时处理 OpenAI provider 与默认模型，F-031 需要把“默认模型 authority”从这里移出。

### 2.3 Routing plugin 依赖

- 现有 plugin 常量与 tier 默认值在 [scripts/model-routing/lib/custom-plugin-routing.mjs](/Users/eduardogan/.config/superpowers/worktrees/opensparrow/feature-f-027-custom-routing-plugin/scripts/model-routing/lib/custom-plugin-routing.mjs)。
- plugin 运行时消费的配置结构已经冻结为 `baseUrl / apiKey / tierModelMap / routing`，F-031 只负责 Dashboard 入口，不重做 plugin 安装链。

## 3. Planned Write Surface

### 3.1 必改文件

- [ui/public/dashboard.html](/Users/eduardogan/.config/superpowers/worktrees/opensparrow/feature-f-027-custom-routing-plugin/ui/public/dashboard.html)  
  原因：新增“模型智能路由”面板，拆分 API 区与路由面板 ownership，接入 loading / disabled / success / error / unsaved API draft 提示。

- [ui/server.mjs](/Users/eduardogan/.config/superpowers/worktrees/opensparrow/feature-f-027-custom-routing-plugin/ui/server.mjs)  
  原因：新增 `GET /api/config/model-routing` 与 `POST /api/config/model-routing`，并把 Dashboard API 保存路径收束成连接配置职责。

### 3.2 建议新增文件

- [ui/public/dashboard-model-routing-state.mjs](/Users/eduardogan/.config/superpowers/worktrees/opensparrow/feature-f-027-custom-routing-plugin/ui/public/dashboard-model-routing-state.mjs)  
  原因：抽离前端纯状态逻辑，承接模式切换、dirty state、routing JSON 校验、按钮禁用逻辑与 payload 组装，避免把新逻辑继续全部塞进 `dashboard.html` 内联脚本。

- [ui/lib/model-routing-config.mjs](/Users/eduardogan/.config/superpowers/worktrees/opensparrow/feature-f-027-custom-routing-plugin/ui/lib/model-routing-config.mjs)  
  原因：集中处理 profile config / auth-profiles / plugin config 的读取、结构校验、模式推导与保存语义，避免 `ui/server.mjs` 再继续膨胀。

- [ui/tests/dashboard-model-routing-state.test.mjs](/Users/eduardogan/.config/superpowers/worktrees/opensparrow/feature-f-027-custom-routing-plugin/ui/tests/dashboard-model-routing-state.test.mjs)  
  原因：覆盖前端 interaction/state 规则，不依赖浏览器也能稳定断言模式切换、dirty state 与禁用态。

- [ui/tests/model-routing-endpoints.test.mjs](/Users/eduardogan/.config/superpowers/worktrees/opensparrow/feature-f-027-custom-routing-plugin/ui/tests/model-routing-endpoints.test.mjs)  
  原因：用临时 profile + 实际 HTTP 请求验证独立接口、关键保存语义、以及“只读最后一次成功保存 API 配置”的服务端契约。

### 3.3 默认不改的文件

- `scripts/model-routing/manage-custom-routing-plugin.mjs`
- `scripts/model-routing/custom-plugin/*`
- `docs/runbooks/F-027-custom-model-routing-plugin.md`
- `longrun/workspaces/opensparrow-unified/*`

这些文件只作为读取依赖或后续是否补文档的判断对象，不作为 F-031 主实现写面。

## 4. Planned Implementation Blocks

### Block A — 后端配置语义 helper

**目标:** 先把 F-031 的持久化语义从 `ui/server.mjs` 中抽出来，形成可测试的纯后端 helper。

**文件:**
- Create: [ui/lib/model-routing-config.mjs](/Users/eduardogan/.config/superpowers/worktrees/opensparrow/feature-f-027-custom-routing-plugin/ui/lib/model-routing-config.mjs)
- Read-only dependency: [scripts/model-routing/lib/custom-plugin-routing.mjs](/Users/eduardogan/.config/superpowers/worktrees/opensparrow/feature-f-027-custom-routing-plugin/scripts/model-routing/lib/custom-plugin-routing.mjs)

**内容:**
- 读取最后一次成功保存的 API 配置：
  - `openclaw.json` 中的 OpenAI provider `baseUrl`
  - `auth-profiles.json` 中 `openai:default` 是否存在 key
- 读取当前 routing 保存状态：
  - `plugins.entries.opensparrow-router.config`
  - 当前 `effectivePrimaryModel`
  - 最近一次成功保存的 `singleModeDefaultModel`
- 生成 `GET /api/config/model-routing` 需要的统一响应对象。
- 校验 `POST /api/config/model-routing` 两种模式请求体：
  - `single` 要求 `singleModeDefaultModel`
  - `smart` 要求四档模型齐全与 `routing` 顶层对象
- 生成保存计划：
  - `single`：保留已存在的 `tierModelMap / routing` 非激活配置，只切主模型
  - `smart`：从已保存 API 配置派生 `baseUrl / apiKey`，写入 router plugin config，并切主模型到 `opensparrow-router/auto`
- 对“不存在 last-saved Base URL/API Key”“plugin config 写入目标不可用”“主模型切换失败”返回系统类失败。

### Block B — 独立后端接口与保存入口收束

**目标:** 在不挤进 `POST /api/config/api` 的前提下，把新接口挂到现有服务上。

**文件:**
- Modify: [ui/server.mjs](/Users/eduardogan/.config/superpowers/worktrees/opensparrow/feature-f-027-custom-routing-plugin/ui/server.mjs)
- Use helper from: [ui/lib/model-routing-config.mjs](/Users/eduardogan/.config/superpowers/worktrees/opensparrow/feature-f-027-custom-routing-plugin/ui/lib/model-routing-config.mjs)

**内容:**
- 新增 `GET /api/config/model-routing`：
  - 返回 `mode / connection / singleModeDefaultModel / tierModelMap / routing / effectivePrimaryModel / router`
  - `connection.apiKeyConfigured` 只返回布尔值，不回传明文
- 新增 `POST /api/config/model-routing`：
  - `single` 保存时切回 OpenAI primary model
  - `smart` 保存时写 plugin config 并切到 `opensparrow-router/auto`
  - 成功与失败响应遵循 spec 中的 message / errors 语义
- 把现有 `POST /api/config/api` 的 Dashboard 责任收束为 `Base URL / API Key`，不再作为路由模式 authority。
- 保持 API 区未保存草稿不会被路由面板接口读取。

### Block C — Dashboard 信息架构与 ownership 拆分

**目标:** 把单一 API 卡片拆成“上游连接 + 模型智能路由”两个子区，但仍留在同一 `API 配置` tab 内。

**文件:**
- Modify: [ui/public/dashboard.html](/Users/eduardogan/.config/superpowers/worktrees/opensparrow/feature-f-027-custom-routing-plugin/ui/public/dashboard.html)

**内容:**
- API 区仅保留：
  - `Base URL`
  - `API Key`
  - API 保存按钮
- 删除 API 区对“模型名称”的 ownership。
- 在 API 区下方新增“模型智能路由”面板：
  - 连接复用提示
  - `single | smart` 模式切换
  - `singleModeDefaultModel`
  - `SIMPLE / MEDIUM / COMPLEX / REASONING`
  - `routing JSON` 编辑器
  - 当前 primary model / secondary message / warning hint
- 当 API 表单存在未保存改动时，路由面板显示“仍使用上次已保存 API 配置”的提醒，而不是读草稿。

### Block D — 前端状态管理与结构校验

**目标:** 在不重写整页 Alpine 结构的前提下，把 F-031 的状态与校验逻辑变成可测试模块。

**文件:**
- Create: [ui/public/dashboard-model-routing-state.mjs](/Users/eduardogan/.config/superpowers/worktrees/opensparrow/feature-f-027-custom-routing-plugin/ui/public/dashboard-model-routing-state.mjs)
- Modify: [ui/public/dashboard.html](/Users/eduardogan/.config/superpowers/worktrees/opensparrow/feature-f-027-custom-routing-plugin/ui/public/dashboard.html)

**内容:**
- 维护独立的 saved snapshot 与 draft：
  - `apiSavedSnapshot`
  - `apiForm`
  - `modelRoutingSaved`
  - `modelRoutingDraft.single`
  - `modelRoutingDraft.smart`
- 支持模式切换时保留未保存输入，不把 `single` 与 `smart` 的字段互相覆盖。
- 让 `routing JSON` 以“原始文本 + 解析结果 + parseError”三态存在。
- 提供前端禁用态判断：
  - 缺已保存 Base URL / API Key
  - 当前模式结构非法
  - 无脏改动
- 提供 payload builder：
  - `single` 只发 `mode + singleModeDefaultModel`
  - `smart` 只发 `mode + tierModelMap + routing`

### Block E — 保存反馈与 UI 成功/失败状态

**目标:** 把 spec 第 8 节的三类状态落到 Dashboard 行为里。

**文件:**
- Modify: [ui/public/dashboard.html](/Users/eduardogan/.config/superpowers/worktrees/opensparrow/feature-f-027-custom-routing-plugin/ui/public/dashboard.html)
- Reuse: [ui/public/dashboard-model-routing-state.mjs](/Users/eduardogan/.config/superpowers/worktrees/opensparrow/feature-f-027-custom-routing-plugin/ui/public/dashboard-model-routing-state.mjs)

**内容:**
- 点击前禁用态：
  - 结构非法直接禁用
  - 只缺 API 已保存配置时禁用并展示原因
- 请求中：
  - 路由面板保存按钮进入 loading/disabled
  - 保留当前编辑内容，不清空编辑器
- 成功态：
  - `single`: `普通单模型配置已保存`
  - `smart`: `模型智能路由已保存` + `主模型已切换到 opensparrow-router/auto`
  - 可选非阻塞提醒：未做 live probe
- 失败态：
  - 保留当前 draft
  - 不误提示“已切换到 opensparrow-router/auto”

### Block F — 自动化测试与执行证据

**目标:** 让前端状态、后端接口、关键保存语义都有独立可跑的自动化入口。

**文件:**
- Create: [ui/tests/dashboard-model-routing-state.test.mjs](/Users/eduardogan/.config/superpowers/worktrees/opensparrow/feature-f-027-custom-routing-plugin/ui/tests/dashboard-model-routing-state.test.mjs)
- Create: [ui/tests/model-routing-endpoints.test.mjs](/Users/eduardogan/.config/superpowers/worktrees/opensparrow/feature-f-027-custom-routing-plugin/ui/tests/model-routing-endpoints.test.mjs)

**内容:**
- `dashboard-model-routing-state.test.mjs`
  - 模式切换保留双 draft
  - `singleModeDefaultModel` ownership
  - `smart` 下的 tier / JSON 校验
  - 禁用态与 dirty state 判定
  - API 未保存草稿提示依赖 saved snapshot，而不是 draft
- `model-routing-endpoints.test.mjs`
  - 启动临时 `ui/server.mjs`，命中 `GET /api/config/model-routing`
  - `POST /api/config/model-routing` 的 `single` / `smart` 成功响应
  - `smart` 保存后 `plugins.entries.opensparrow-router.config` 正确派生 `baseUrl / apiKey / tierModelMap / routing`
  - `single` 保存后保留已有 router config，但主模型回到 OpenAI
  - API 配置缺失时返回结构化错误

## 5. Recommended Execution Order

1. 先写 `ui/lib/model-routing-config.mjs`，冻结后端读写语义和字段命名。
2. 在 `ui/server.mjs` 接入 `GET/POST /api/config/model-routing`，先让接口可读可写。
3. 新增 `ui/public/dashboard-model-routing-state.mjs`，把模式/dirty/JSON 校验变成纯函数。
4. 修改 `ui/public/dashboard.html`，完成 API 区 ownership 拆分与路由面板接线。
5. 补 `ui/tests/dashboard-model-routing-state.test.mjs` 和 `ui/tests/model-routing-endpoints.test.mjs`。
6. 跑完 focused tests 与 `node --check` 后再进入 review；通过后由 verifier 做交互与保存语义复核。

## 6. Verification Plan

### 6.1 Automated checks

```bash
node --check ui/server.mjs
node --test ui/tests/dashboard-model-routing-state.test.mjs
node --test ui/tests/model-routing-endpoints.test.mjs
```

### 6.2 Evidence the verifier still needs

- Dashboard API tab 中，API 区和“模型智能路由”面板的职责边界截图或录屏证据。
- `GET /api/config/model-routing` 返回值，证明路由面板连接状态来自 last-saved API config。
- `single` 保存前后证据：主模型回到 OpenAI，router config 保留不删。
- `smart` 保存前后证据：主模型切到 `opensparrow-router/auto`，plugin config 正确派生已保存 `Base URL / API Key`。
- 负向证据：API 面板有未保存草稿时，路由面板不消费草稿值，只显示提示。

## 7. Docs / Longrun Decision

本 feature 的实现 packet 默认 **不直接扩写** `docs/runbooks/F-027-custom-model-routing-plugin.md`、`feature_list.json` 或 `claude-progress.txt`。

只在以下条件满足时，单列一个窄文档/closeout packet：

- Dashboard 路由面板已经通过 review + verifier，且确实要成为正式推荐的 operator path；
- Commander 明确要求把 F-031 的 UI 路径写入 runbook 或 longrun；
- 写回内容只描述 F-031 的 Dashboard 入口，不改写 F-027 最小 plugin 闭环的既有口径。
