# Tasks: WeCom Channel Integration Hardening

**Input**: `specs/011-wecom-channel-integration/spec.md`, `specs/011-wecom-channel-integration/plan.md`
**Prerequisites**: `AGENTS.md`, `.specify/memory/constitution.md`, `docs/governance/framework-stack.md`

## Phase 1: Spec & Scope (P0)

- [x] T001 完成 `specs/011-wecom-channel-integration/spec.md`
- [x] T002 完成 `specs/011-wecom-channel-integration/plan.md`
- [x] T003 完成 `specs/011-wecom-channel-integration/tasks.md`

## Phase 2: TDD 提取企微 helper (P0)

- [x] T004 新增 `ui/lib/wecom.test.mjs`，先写失败测试
- [x] T005 运行 `node --test ui/lib/wecom.test.mjs` 并确认 red
- [x] T006 新增 `ui/lib/wecom.mjs`
- [x] T007 修改 `ui/server.mjs` 以导入企微 helper
- [x] T008 运行 `node --test ui/lib/wecom.test.mjs` 并确认 green
- [x] T009 新增 `ui/public/wecom-helpers.test.mjs`，先写失败测试
- [x] T010 运行 `node --test ui/public/wecom-helpers.test.mjs` 并确认 red
- [x] T011 新增 `ui/public/wecom-helpers.js`，并让 `ui/public/index.html`、`ui/public/dashboard.html` 调用共享 helper
- [x] T012 运行 `node --test ui/public/wecom-helpers.test.mjs` 并确认 green
- [x] T013 运行 `node --check ui/server.mjs`

## Phase 3: 文档与收口 (P0)

- [x] T014 新增 `docs/runbooks/F-014-wecom-channel-integration.md`
- [x] T015 在 runbook 中明确“自动验证已完成项”“`Bot ID + Secret` 长连接主链待补项”与“callback / 自建应用按业务另行补证项”
- [x] T016 更新 `longrun/workspaces/opensparrow-unified/claude-progress.txt`

## Validation Checklist

- [x] V001 企微纯逻辑已从 `ui/server.mjs` 提取到独立 helper 模块
- [x] V002 `ui/lib/wecom.test.mjs` 通过
- [x] V003 浏览器端企微校验已集中到共享 helper
- [x] V004 `ui/server.mjs` 语法通过
- [x] V005 runbook 明确区分长连接主链补证边界与 callback / 自建应用扩展补证边界
- [x] V006 长期记录没有伪造真实企微 E2E 已通过
