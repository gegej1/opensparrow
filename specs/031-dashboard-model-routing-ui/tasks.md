# F-031 Tasks — Dashboard 模型智能路由配置入口

## Phase 1 — Backend Contract

- [ ] **T001 建立路由配置 helper 写面与命名**
  - Files:
    - Create: [ui/lib/model-routing-config.mjs](/Users/eduardogan/.config/superpowers/worktrees/opensparrow/feature-f-027-custom-routing-plugin/ui/lib/model-routing-config.mjs)
    - Read-only: [scripts/model-routing/lib/custom-plugin-routing.mjs](/Users/eduardogan/.config/superpowers/worktrees/opensparrow/feature-f-027-custom-routing-plugin/scripts/model-routing/lib/custom-plugin-routing.mjs)
  - Acceptance:
    - helper 能读取 last-saved API `baseUrl`
    - helper 能判断 `apiKeyConfigured`
    - helper 能读取 `plugins.entries.opensparrow-router.config`
    - helper 能生成 `mode / singleModeDefaultModel / tierModelMap / routing / effectivePrimaryModel`
  - Test step:
    - 为后续 endpoint test 预留可注入 profile 路径/依赖的函数入口
  - Gate:
    - 无需单独 verifier；完成后继续 T002

- [ ] **T002 固化 `POST /api/config/model-routing` 的 single 保存语义**
  - Files:
    - Modify: [ui/lib/model-routing-config.mjs](/Users/eduardogan/.config/superpowers/worktrees/opensparrow/feature-f-027-custom-routing-plugin/ui/lib/model-routing-config.mjs)
  - Acceptance:
    - `mode=single` 时要求 `singleModeDefaultModel`
    - 主模型切回 `openai/<singleModeDefaultModel>` 或等价 primary target
    - 已存在的 `tierModelMap / routing` 不被粗暴删除
    - 最近一次成功保存的 `singleModeDefaultModel` 可被后续 GET 回填
  - Test step:
    - 在 [ui/tests/model-routing-endpoints.test.mjs](/Users/eduardogan/.config/superpowers/worktrees/opensparrow/feature-f-027-custom-routing-plugin/ui/tests/model-routing-endpoints.test.mjs) 中增加 `single` 保存场景
  - Gate:
    - 无需单独 verifier；完成后继续 T003

- [ ] **T003 固化 `POST /api/config/model-routing` 的 smart 保存语义**
  - Files:
    - Modify: [ui/lib/model-routing-config.mjs](/Users/eduardogan/.config/superpowers/worktrees/opensparrow/feature-f-027-custom-routing-plugin/ui/lib/model-routing-config.mjs)
  - Acceptance:
    - `mode=smart` 时要求 `SIMPLE / MEDIUM / COMPLEX / REASONING`
    - `routing` 必须是合法对象
    - smart 保存从“最后一次成功保存的 API 配置”派生 `baseUrl / apiKey`
    - smart 保存成功后主模型切到 `opensparrow-router/auto`
    - 不做 live probe 作为保存门槛
  - Test step:
    - 在 [ui/tests/model-routing-endpoints.test.mjs](/Users/eduardogan/.config/superpowers/worktrees/opensparrow/feature-f-027-custom-routing-plugin/ui/tests/model-routing-endpoints.test.mjs) 中增加 `smart` 保存与 API 缺失失败场景
  - Gate:
    - **Review checkpoint**：backend 保存语义完成后回 packet review

## Phase 2 — Server Endpoints

- [ ] **T004 接入独立 `GET /api/config/model-routing` 接口**
  - Files:
    - Modify: [ui/server.mjs](/Users/eduardogan/.config/superpowers/worktrees/opensparrow/feature-f-027-custom-routing-plugin/ui/server.mjs)
    - Use: [ui/lib/model-routing-config.mjs](/Users/eduardogan/.config/superpowers/worktrees/opensparrow/feature-f-027-custom-routing-plugin/ui/lib/model-routing-config.mjs)
  - Acceptance:
    - 新接口返回 `mode / connection / singleModeDefaultModel / tierModelMap / routing / effectivePrimaryModel / router`
    - `connection.apiKeyConfigured` 只返回布尔值
    - 路由面板连接状态明确标记 `source = last-saved-api-config`
  - Test step:
    - `node --test ui/tests/model-routing-endpoints.test.mjs`
  - Gate:
    - 无需单独 verifier；完成后继续 T005

- [ ] **T005 接入独立 `POST /api/config/model-routing` 接口，并收束 `POST /api/config/api` ownership**
  - Files:
    - Modify: [ui/server.mjs](/Users/eduardogan/.config/superpowers/worktrees/opensparrow/feature-f-027-custom-routing-plugin/ui/server.mjs)
  - Acceptance:
    - `POST /api/config/model-routing` 独立处理模式与路由配置
    - `POST /api/config/api` 不再作为 Dashboard 默认模型 authority
    - 路由接口不读取 API 面板未保存草稿
    - 错误响应落到 `errors[]`，成功响应带明确 `mode` 与 `message`
  - Test step:
    - `node --check ui/server.mjs`
    - `node --test ui/tests/model-routing-endpoints.test.mjs`
  - Gate:
    - **Review checkpoint**：独立接口完成后回 packet review

## Phase 3 — Frontend Ownership & State

- [ ] **T006 新建前端纯状态 helper，覆盖模式切换、dirty state 与 JSON 校验**
  - Files:
    - Create: [ui/public/dashboard-model-routing-state.mjs](/Users/eduardogan/.config/superpowers/worktrees/opensparrow/feature-f-027-custom-routing-plugin/ui/public/dashboard-model-routing-state.mjs)
    - Create: [ui/tests/dashboard-model-routing-state.test.mjs](/Users/eduardogan/.config/superpowers/worktrees/opensparrow/feature-f-027-custom-routing-plugin/ui/tests/dashboard-model-routing-state.test.mjs)
  - Acceptance:
    - `single` 与 `smart` 双 draft 可并存
    - 模式切换不丢失未保存输入
    - `routing JSON` 有原始文本、解析结果、parseError 三态
    - 禁用态严格符合 spec 8.1
  - Test step:
    - `node --test ui/tests/dashboard-model-routing-state.test.mjs`
  - Gate:
    - 无需单独 verifier；完成后继续 T007

- [ ] **T007 调整 Dashboard API tab 信息架构与表单 ownership**
  - Files:
    - Modify: [ui/public/dashboard.html](/Users/eduardogan/.config/superpowers/worktrees/opensparrow/feature-f-027-custom-routing-plugin/ui/public/dashboard.html)
    - Use: [ui/public/dashboard-model-routing-state.mjs](/Users/eduardogan/.config/superpowers/worktrees/opensparrow/feature-f-027-custom-routing-plugin/ui/public/dashboard-model-routing-state.mjs)
  - Acceptance:
    - API 区只保留 `Base URL / API Key`
    - 路由面板位于 API 区下方
    - `singleModeDefaultModel` 迁到普通模式
    - `SIMPLE / MEDIUM / COMPLEX / REASONING + routing JSON` 只在 smart 模式展示
    - 路由面板能明确显示“继续使用上次已保存 API 配置”
  - Test step:
    - `node --test ui/tests/dashboard-model-routing-state.test.mjs`
  - Gate:
    - **Review checkpoint**：前端 ownership 与信息架构完成后回 packet review

- [ ] **T008 接入路由面板保存按钮的 loading / success / error 主路径**
  - Files:
    - Modify: [ui/public/dashboard.html](/Users/eduardogan/.config/superpowers/worktrees/opensparrow/feature-f-027-custom-routing-plugin/ui/public/dashboard.html)
  - Acceptance:
    - 点击前禁用态、请求中 loading/disabled、点击后系统类失败三者分离
    - `smart` 成功后出现“主模型已切换到 opensparrow-router/auto”
    - 失败时保留当前 draft，不误报成功
    - API 面板草稿与路由面板保存互不串写
  - Test step:
    - `node --test ui/tests/dashboard-model-routing-state.test.mjs`
    - `node --test ui/tests/model-routing-endpoints.test.mjs`
  - Gate:
    - 无需单独 verifier；完成后继续 T009

## Phase 4 — Focused Verification Handoff

- [ ] **T009 跑完 focused automated checks，形成 reviewer / verifier 入口**
  - Files:
    - Read: [ui/server.mjs](/Users/eduardogan/.config/superpowers/worktrees/opensparrow/feature-f-027-custom-routing-plugin/ui/server.mjs)
    - Read: [ui/public/dashboard.html](/Users/eduardogan/.config/superpowers/worktrees/opensparrow/feature-f-027-custom-routing-plugin/ui/public/dashboard.html)
    - Read: [ui/tests/dashboard-model-routing-state.test.mjs](/Users/eduardogan/.config/superpowers/worktrees/opensparrow/feature-f-027-custom-routing-plugin/ui/tests/dashboard-model-routing-state.test.mjs)
    - Read: [ui/tests/model-routing-endpoints.test.mjs](/Users/eduardogan/.config/superpowers/worktrees/opensparrow/feature-f-027-custom-routing-plugin/ui/tests/model-routing-endpoints.test.mjs)
  - Acceptance:
    - `node --check ui/server.mjs` 通过
    - `node --test ui/tests/dashboard-model-routing-state.test.mjs` 通过
    - `node --test ui/tests/model-routing-endpoints.test.mjs` 通过
    - reviewer 能从 diff 中直接看到 ownership 拆分、独立接口和关键保存语义
  - Test step:
    - 依次运行上述 3 个命令并保存输出
  - Gate:
    - **Verifier checkpoint**：自动化检查全绿后进入 verifier

- [ ] **T010 单列文档 / longrun 是否需要 follow-up，不默认扩写**
  - Files:
    - Maybe modify later: [docs/runbooks/F-027-custom-model-routing-plugin.md](/Users/eduardogan/.config/superpowers/worktrees/opensparrow/feature-f-027-custom-routing-plugin/docs/runbooks/F-027-custom-model-routing-plugin.md)
    - Maybe modify later: `longrun/workspaces/opensparrow-unified/*`
  - Acceptance:
    - 只输出“是否需要单独文档 packet”的判断
    - 不在实现 packet 内顺手改写 `F-027` PASS 口径
    - 不默认更新 longrun
  - Test step:
    - 无自动化测试；由 commander / closer 在 review 与 verifier 之后决定
  - Gate:
    - **Commander decision**，不阻塞代码 review/verifier
