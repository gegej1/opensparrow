# Tasks: Commander Orchestration Governance

**Input**: `specs/013-commander-orchestration/spec.md`, `specs/013-commander-orchestration/plan.md`
**Prerequisites**: `AGENTS.md`, `docs/项目持久化说明.md`, `.specify/memory/constitution.md`

## Phase 1: Spec Foundation (P0)

- [ ] T001 新增 `specs/013-commander-orchestration/spec.md`，明确固定编制、扩编规则、总司令边界与成功标准
- [ ] T002 新增 `specs/013-commander-orchestration/plan.md`，说明本轮仅做制度落盘与 longrun 同步
- [ ] T003 新增 `specs/013-commander-orchestration/tasks.md`，把 runbook / longrun / validation 拆成可执行步骤

## Phase 2: Runbook & Longrun Sync (P0)

- [ ] T004 新增 `docs/runbooks/F-019-commander-orchestration.md`，写明角色职责、派单模板、冲突规避、验收与收口流程
- [ ] T005 更新 `longrun/workspaces/opensparrow-unified/feature_list.json`，追加 `F-019` 条目
- [ ] T006 更新 `longrun/workspaces/opensparrow-unified/claude-progress.txt`，追加本轮制度落盘记录并说明未改运行时代码

## Phase 3: Validation (P0)

- [ ] T007 运行 `python3 -m json.tool longrun/workspaces/opensparrow-unified/feature_list.json >/dev/null`
- [ ] T008 运行 `python3 longrun/scripts/progress_report.py longrun/workspaces/opensparrow-unified/feature_list.json`
- [ ] T009 运行 `./longrun/workspaces/opensparrow-unified/init.sh`

## Validation Checklist

- [ ] V001 `specs/013-commander-orchestration/` 下存在 `spec.md`、`plan.md`、`tasks.md`
- [ ] V002 `docs/runbooks/F-019-commander-orchestration.md` 明确固定编制、临时扩编与总司令 SOP
- [ ] V003 `feature_list.json` 可被 JSON 解析且包含 `F-019`
- [ ] V004 `claude-progress.txt` 已记录“制度落盘、未改运行时代码”的会话摘要
- [ ] V005 unified workspace init 仍可执行
