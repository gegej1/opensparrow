# Tasks: codeSPEC Framework Full Adaptation for OpenSparrow

**Input**: `specs/016-codespec-framework-adaptation/spec.md`, `specs/016-codespec-framework-adaptation/plan.md`
**Prerequisites**: `AGENTS.md`, `.specify/memory/constitution.md`, `docs/reference/codeSPEC-template/README.md`, `longrun/workspaces/opensparrow-unified/app_spec.md`

## Phase 1: Scope & Governance Design (P0)

- [ ] T001 完成 `specs/016-codespec-framework-adaptation/spec.md`，明确本轮是“底层框架适配”而不只是 reference 镜像
- [ ] T002 完成 `specs/016-codespec-framework-adaptation/plan.md`，定义治理文档面、authority wiring、longrun scaffold 对齐和 reference 扩展
- [ ] T003 完成 `specs/016-codespec-framework-adaptation/tasks.md`

## Phase 2: TDD 扩展 reference import (P0)

- [ ] T004 修改 `scripts/tests/import-codespec-template.test.mjs`，先写 failing assertions，覆盖新增 `AgentTeam` / `UnifiedFramework/12` 白名单镜像
- [ ] T005 运行 `node --test scripts/tests/import-codespec-template.test.mjs` 并确认 red
- [ ] T006 修改 `scripts/import-codespec-template.sh`，扩展白名单与 manifest 写出逻辑
- [ ] T007 运行 `node --test scripts/tests/import-codespec-template.test.mjs` 并确认 green
- [ ] T008 运行 `bash -n scripts/import-codespec-template.sh`

## Phase 3: 本地化治理文档适配 (P0)

- [ ] T009 新增 `docs/governance/README.md`
- [ ] T010 新增 `docs/governance/framework-stack.md`
- [ ] T011 新增 `docs/governance/project-onboarding-sop.md`
- [ ] T012 新增 `docs/governance/dispatch-templates.md`
- [ ] T013 新增 `docs/governance/quick-reference.md`
- [ ] T014 新增 `docs/runbooks/F-022-codespec-framework-adaptation.md`

## Phase 4: Authority Wiring & Scaffold Alignment (P0)

- [ ] T015 更新 `AGENTS.md` 与 `.specify/memory/constitution.md`，接入新的治理入口与 authority order
- [ ] T016 更新 `README.md`，把 governance 入口暴露到项目首页
- [ ] T017 更新 `longrun/templates/initializer_prompt.template.md` 与 `longrun/templates/coding_prompt.template.md`
- [ ] T018 更新 `docs/reference/codeSPEC-template/README.md` 与 `docs/reference/codeSPEC-template/IMPORT_SCOPE.md`
- [ ] T019 运行 `./scripts/import-codespec-template.sh /Users/eduardogan/Desktop/GHJProject/codeSPEC`

## Phase 5: Longrun Sync & Validation (P0)

- [ ] T020 更新 `longrun/workspaces/opensparrow-unified/feature_list.json`，新增 `F-022`
- [ ] T021 更新 `longrun/workspaces/opensparrow-unified/claude-progress.txt`
- [ ] T022 运行 `python3 -m json.tool longrun/workspaces/opensparrow-unified/feature_list.json >/dev/null`
- [ ] T023 运行 `./longrun/workspaces/opensparrow-unified/init.sh`
- [ ] T024 运行 `python3 longrun/scripts/progress_report.py longrun/workspaces/opensparrow-unified/feature_list.json`
- [ ] T025 人工复查治理文档 / authority wiring / reference mirror / longrun scaffold 口径一致

## Validation Checklist

- [ ] V001 当前仓存在可直接使用的 `docs/governance/` 底层治理文档面
- [ ] V002 `AGENTS.md`、constitution、`README.md` 都能指向正确的框架入口
- [ ] V003 `longrun` prompt scaffold 明确自己不是 feature / execution authority
- [ ] V004 import 脚本仍保持 source 只读、白名单复制、本地说明文档不覆盖
- [ ] V005 unified longrun 记录已标记底层框架适配完成
