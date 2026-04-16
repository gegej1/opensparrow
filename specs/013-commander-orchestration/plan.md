# Implementation Plan: Commander Orchestration Governance

**Branch**: `013-commander-orchestration` | **Date**: 2026-04-09 | **Spec**: `specs/013-commander-orchestration/spec.md`

## Summary

本次实现不是运行时代码开发，而是把 OpenSparrow 后续默认执行制度落成统一文档与长期记录，确保未来每个任务都能沿同一套指挥模型推进：

1. 在 `specs/013-commander-orchestration/` 下补齐 `spec.md`、`plan.md`、`tasks.md`；
2. 在 `docs/runbooks/F-019-commander-orchestration.md` 中写明总司令职责、固定编制、扩编规则、冲突规避与收口 SOP；
3. 在 unified longrun 中新增 `F-019`，把该制度记为已采纳 feature；
4. 通过 JSON 校验、progress report 与 workspace init 证明记录链完整可读。

## Technical Context

- **Repository root**: `/Users/eduardogan/Desktop/GHJProject/opensparrow`
- **Spec files**: `specs/013-commander-orchestration/{spec,plan,tasks}.md`
- **Runbook**: `docs/runbooks/F-019-commander-orchestration.md`
- **Longrun records**:
  - `longrun/workspaces/opensparrow-unified/feature_list.json`
  - `longrun/workspaces/opensparrow-unified/claude-progress.txt`
- **Validation commands**:
  - `python3 -m json.tool longrun/workspaces/opensparrow-unified/feature_list.json >/dev/null`
  - `python3 longrun/scripts/progress_report.py longrun/workspaces/opensparrow-unified/feature_list.json`
  - `./longrun/workspaces/opensparrow-unified/init.sh`

## Design

### A. Spec / Plan / Tasks 作为制度真源

- `spec.md`：定义为什么要采用“总司令 + 固定 5 子 Agent + 可临时扩编”的制度，以及成功标准。
- `plan.md`：定义本轮只落文档、不改运行时代码的实现路径。
- `tasks.md`：把制度落盘拆成可验证的小任务，方便后续重复执行或审查。

### B. Runbook 作为日常操作入口

- 固定编制：定义 5 个常备角色的职责边界。
- 临时扩编：定义何时加人、加什么角色、何时撤编。
- 总司令 SOP：定义从接单、分级、派工、审阅、验收到对外汇报的标准动作。
- 冲突规避：定义同轮并行不改同一文件集、同一功能只允许一个主实现者等规则。

### C. Longrun 作为采纳证据

- `feature_list.json`：记录 `F-019` 的描述、依赖、验收项与步骤。
- `claude-progress.txt`：记录本轮是制度落盘，不涉及运行时代码改动，并落下验证证据。

## Execution Phases

### Phase 1 — Governance Spec

- 产出 `specs/013-commander-orchestration/{spec,plan,tasks}.md`
- 确保 spec、plan、tasks 口径一致，避免“固定编制”和“扩编规则”互相矛盾

### Phase 2 — Runbook & Longrun Sync

- 新增 `docs/runbooks/F-019-commander-orchestration.md`
- 在 `feature_list.json` 追加 `F-019`
- 在 `claude-progress.txt` 追加 Session 13 记录

### Phase 3 — Validation

- 校验 `feature_list.json` 是合法 JSON
- 运行 progress report，确认特性清单可被 longrun 工具读取
- 运行 unified workspace init，确认长期工作区入口未被文档改动破坏

## Out of Scope

- 不实现自动化派单脚本
- 不修改任何运行时代码文件
- 不补做新的 CI job 或平台脚本改造
