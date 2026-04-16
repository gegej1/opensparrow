# Tasks: Commander Orchestration Governance

**Input**: `specs/013-commander-orchestration-governance/spec.md`, `specs/013-commander-orchestration-governance/plan.md`
**Prerequisites**: `AGENTS.md`, `.specify/memory/constitution.md`, `longrun/workspaces/opensparrow-unified/app_spec.md`

## Phase 1: Spec Scaffolding (P0)

- [ ] T001 新增 `specs/013-commander-orchestration-governance/spec.md`，定义固定编制、职责边界、派工模式、扩编规则与 non-goals
- [ ] T002 新增 `specs/013-commander-orchestration-governance/plan.md`，说明落盘范围、设计要点与验证计划
- [ ] T003 新增 `specs/013-commander-orchestration-governance/tasks.md`，把本轮动作拆成可执行阶段与校验清单

## Phase 2: Commander SOP Runbook (P0)

- [ ] T004 新增 `docs/runbooks/F-019-commander-orchestration-governance.md`，记录总司令工作流与会话级 SOP
- [ ] T005 在 runbook 中补齐固定 5 子 Agent 职责卡、输入/输出、禁区与优先事项
- [ ] T006 在 runbook 中补齐小任务 / 中任务 / 多线战役三类默认编队，以及临时扩编触发条件与建议角色
- [ ] T007 在 runbook 中补齐文件所有权、并行改动边界、失败升级与任务收口规则

## Phase 3: Unified Longrun Sync (P0)

- [ ] T008 更新 `longrun/workspaces/opensparrow-unified/feature_list.json`，新增 `F-019` 条目
- [ ] T009 更新 `longrun/workspaces/opensparrow-unified/claude-progress.txt`，追加本轮制度落盘记录，并注明本轮未修改运行时代码

## Phase 4: Validation & Handoff (P0)

- [ ] T010 运行 `python3 -m json.tool longrun/workspaces/opensparrow-unified/feature_list.json >/dev/null`
- [ ] T011 运行 `./longrun/workspaces/opensparrow-unified/init.sh`
- [ ] T012 运行 `python3 longrun/scripts/progress_report.py longrun/workspaces/opensparrow-unified/feature_list.json`
- [ ] T013 复查 spec / plan / tasks / runbook / longrun 五处口径一致

## Validation Checklist

- [ ] V001 固定 5 子 Agent 的职责边界在 spec 与 runbook 中一致
- [ ] V002 总司令默认负责调度、审阅、集成，而不是主力开发
- [ ] V003 runbook 中明确允许按任务临时扩编 1–3 个特遣 Agent
- [ ] V004 `feature_list.json` 与 `claude-progress.txt` 已同步本 feature
- [ ] V005 统一工作区 init 与 progress report 仍可执行
