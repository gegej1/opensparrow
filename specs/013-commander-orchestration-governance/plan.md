# Implementation Plan: Commander Orchestration Governance

**Branch**: `013-commander-orchestration-governance` | **Date**: 2026-04-09 | **Spec**: `specs/013-commander-orchestration-governance/spec.md`

## Summary

本次实现不涉及运行时代码，而是把“总司令 + 固定 5 子 Agent + 可临时扩编”的协作制度正式收口到统一真源仓。落盘目标包括：

1. 为这套制度补齐 `spec.md`、`plan.md`、`tasks.md`；
2. 新增一份可直接执行的 runbook，定义角色卡、派工模板、冲突规避与收口动作；
3. 将该制度同步到 unified longrun 的 feature list 与 progress 记录；
4. 通过 workspace init 与 progress report 证明长期骨架仍然有效。

## Technical Context

- **Repository root**: `/Users/eduardogan/Desktop/GHJProject/opensparrow`
- **Nature of change**: Documentation / governance only（无运行时代码变更）
- **Primary write targets**:
  - `specs/013-commander-orchestration-governance/spec.md`
  - `specs/013-commander-orchestration-governance/plan.md`
  - `specs/013-commander-orchestration-governance/tasks.md`
  - `docs/runbooks/F-019-commander-orchestration-governance.md`
  - `longrun/workspaces/opensparrow-unified/feature_list.json`
  - `longrun/workspaces/opensparrow-unified/claude-progress.txt`
- **Validation anchors**:
  - `./longrun/workspaces/opensparrow-unified/init.sh`
  - `python3 longrun/scripts/progress_report.py longrun/workspaces/opensparrow-unified/feature_list.json`
  - `python3 -m json.tool longrun/workspaces/opensparrow-unified/feature_list.json`

## Design

### A. Fixed Roster

- 固定编制保持 5 人：`claudecodeA`、`codexA`、`codexB`、`codexC`、`claudecodeB`。
- 其中 `claudecodeA` 负责前置拆解，`claudecodeB` 负责收口与文档，`codexA/B` 负责实现，`codexC` 负责验证与回归。
- 总司令不承担默认实现职责，只在任务冲突、关键集成、或连续多轮失败时亲自介入。

### B. Dispatch Workflow

- 小任务：默认派 `claudecodeA + 1 codex + codexC`。
- 中任务：默认派 `claudecodeA + codexA + codexB + codexC + claudecodeB`。
- 多线战役：在中任务编队上按需临时扩编 `Scout / Fix / Verify / Reviewer / Planner` 类特遣 Agent。
- runbook 中需要同时定义任务派单模板、输出预期和审阅顺序。

### C. Conflict Avoidance

- 两个实现 Agent 不同时改同一文件集。
- 文档收口与代码实现职责分离，避免 runbook / longrun 与实现文件互相覆盖。
- 总司令必须在派工前声明所有权边界，并在集成前做一次结果对账。
- 若子 Agent 连续两轮未能解决同一阻塞，总司令升级处理并重新拆分任务。

### D. Record-Keeping Sync

- 这次制度变更必须同步到 `specs/`、`docs/runbooks/`、`feature_list.json`、`claude-progress.txt`。
- runbook 作为会话级 SOP，feature list 作为是否已落地的 checklist，progress 作为时间线证据。
- 以后每轮采用该制度推进新 feature 时，应继续引用本 runbook，并在具体 feature 中补对应 spec / plan / tasks。

## Validation Plan

1. 运行 `python3 -m json.tool longrun/workspaces/opensparrow-unified/feature_list.json >/dev/null`，确认 feature list 语法合法。
2. 运行 `./longrun/workspaces/opensparrow-unified/init.sh`，确认 unified workspace 初始化链仍然可用。
3. 运行 `python3 longrun/scripts/progress_report.py longrun/workspaces/opensparrow-unified/feature_list.json`，确认 feature 汇总报告可生成。
4. 人工检查新建文档间的口径一致性：固定 5 人、临时扩编 1–3 人、总司令主要负责调度与审阅。
