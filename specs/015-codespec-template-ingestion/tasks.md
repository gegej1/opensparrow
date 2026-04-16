# Tasks: codeSPEC Template Ingestion & Repo Cleanup Mapping

**Input**: `specs/015-codespec-template-ingestion/spec.md`, `specs/015-codespec-template-ingestion/plan.md`
**Prerequisites**: `AGENTS.md`, `.specify/memory/constitution.md`, `longrun/workspaces/opensparrow-unified/app_spec.md`

## Phase 1: Spec & Boundary Definition (P0)

- [ ] T001 完成 `specs/015-codespec-template-ingestion/spec.md`，定义导入目标、白名单、跳过清单与 non-goals
- [ ] T002 完成 `specs/015-codespec-template-ingestion/plan.md`，说明脚本契约、reference 落点与验证链
- [ ] T003 完成 `specs/015-codespec-template-ingestion/tasks.md`，把本轮动作拆成文档、脚本、导入、同步、验证五段

## Phase 2: TDD Import Script (P0)

- [ ] T004 新增 `scripts/tests/import-codespec-template.test.mjs`，先写 failing test，覆盖“只同步白名单文件 + 不覆盖本地 README”
- [ ] T005 运行 `node --test scripts/tests/import-codespec-template.test.mjs` 并确认 red
- [ ] T006 新增 `scripts/import-codespec-template.sh`，实现最小白名单导入逻辑与 manifest 写出
- [ ] T007 再次运行 `node --test scripts/tests/import-codespec-template.test.mjs`，确认 green
- [ ] T008 运行 `bash -n scripts/import-codespec-template.sh`

## Phase 3: Reference Surface & Real Import (P0)

- [ ] T009 新增 `docs/reference/codeSPEC-template/README.md`，说明 reference 定位、authority boundary 与使用方式
- [ ] T010 新增 `docs/reference/codeSPEC-template/IMPORT_SCOPE.md`，记录导入白名单、跳过项和当前仓映射关系
- [ ] T011 新增 `docs/runbooks/F-021-codespec-template-ingestion.md`，记录真实刷新命令、验证命令与风险边界
- [ ] T012 更新 `longrun/README.md`、`longrun/CHECKLIST.md`、`longrun/METHOD.zh-CN.md`，吸收 `codeSPEC` 的 longrun 边界说明
- [ ] T013 运行 `./scripts/import-codespec-template.sh /Users/eduardogan/Desktop/GHJProject/codeSPEC`，生成 `docs/reference/codeSPEC-template/upstream/UnifiedFramework/` 镜像
- [ ] T014 更新 `README.md`，增加 `codeSPEC` 模板参考入口

## Phase 4: Unified Longrun Sync (P0)

- [ ] T015 更新 `longrun/workspaces/opensparrow-unified/feature_list.json`，新增 `F-021` 条目
- [ ] T016 更新 `longrun/workspaces/opensparrow-unified/claude-progress.txt`，记录导入范围、跳过清单和验证结果

## Phase 5: Validation & Handoff (P0)

- [ ] T017 运行 `python3 -m json.tool longrun/workspaces/opensparrow-unified/feature_list.json >/dev/null`
- [ ] T018 运行 `./longrun/workspaces/opensparrow-unified/init.sh`
- [ ] T019 运行 `python3 longrun/scripts/progress_report.py longrun/workspaces/opensparrow-unified/feature_list.json`
- [ ] T020 人工复查 spec / plan / tasks / reference docs / runbook / longrun 口径一致

## Validation Checklist

- [ ] V001 `codeSPEC` source 目录未被修改
- [ ] V002 导入结果只包含约定的 `UnifiedFramework` 白名单文件
- [ ] V003 当前仓本地 `README.md`、`IMPORT_SCOPE.md` 不会被导入脚本覆盖
- [ ] V004 `feature_list.json` 与 `claude-progress.txt` 已同步本 feature
- [ ] V005 unified workspace init 与 progress report 仍可运行
