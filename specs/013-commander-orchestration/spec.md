# Feature Specification: Commander Orchestration Governance

**Feature Branch**: `013-commander-orchestration`
**Created**: 2026-04-09
**Status**: Planning
**Input**: 用户确认后续由当前会话承担 OpenSparrow 项目的“总司令/调度器”角色，默认采用“总司令 + 固定 5 子 Agent + 可临时扩编”的执行制度，并要求把该制度正式记录到仓内长期文档体系。

## Context & References

- `AGENTS.md` — 统一仓开发边界、文档驱动要求与 longrun 同步约束
- `docs/项目持久化说明.md` — 统一真源与长期工作区入口说明
- `.specify/memory/constitution.md` — 文档驱动、模块边界、验证优先等治理原则
- `longrun/workspaces/opensparrow-unified/app_spec.md` — 当前 unified workspace 的产品与交付背景
- `longrun/workspaces/opensparrow-unified/feature_list.json` — 统一特性清单真源
- `longrun/workspaces/opensparrow-unified/claude-progress.txt` — 会话级 handoff 与验证记录

## User Stories

### User Story 1 — 项目负责人需要一套稳定的任务编队制度（P0）

作为项目负责人，我希望每次收到新任务时，都能先判断任务规模，再自动套用固定编队或临时扩编编队，而不是每次临时决定谁做什么。

**Acceptance**:

1. 仓内文档明确列出固定 5 子 Agent 的职责边界。
2. 文档明确列出何时需要临时扩编，以及可增配的临时角色类型。
3. 文档明确列出总司令本人负责什么、不负责什么。

### User Story 2 — 执行者需要避免多 Agent 冲突（P0）

作为执行者，我希望多个 Agent 并行时不会互相覆盖、抢同一文件或跳过验收，避免返工。

**Acceptance**:

1. 文档明确规定同一轮并行内的文件边界与冲突规避规则。
2. 文档明确规定谁负责验证、谁负责文档收口、谁负责最终集成判断。
3. 文档明确规定当子 Agent 连续两轮未解决问题时，如何升级处理。

### User Story 3 — 后续接手者需要可落地的总司令 SOP（P1）

作为接手者，我希望在不追溯聊天记录的情况下，直接从仓内 spec / runbook / longrun 记录理解这套制度，并照此执行。

**Acceptance**:

1. `specs/013-commander-orchestration/` 下存在 `spec.md`、`plan.md`、`tasks.md`。
2. `docs/runbooks/F-019-commander-orchestration.md` 描述了日常派单、扩编、验收、收口流程。
3. `feature_list.json` 与 `claude-progress.txt` 都记录了该制度已被采纳。

## Functional Requirements

- FR-001: 系统 MUST 定义固定 5 子 Agent 的长期职责：`claudecodeA`、`codexA`、`codexB`、`codexC`、`claudecodeB`。
- FR-002: 系统 MUST 定义总司令的职责边界：优先负责拆解、派工、审阅、集成与验收，不作为默认主力实现者。
- FR-003: 系统 MUST 定义临时扩编规则，至少包含“何时扩编”“可扩编哪些临时角色”“任务结束后如何撤编”。
- FR-004: 系统 MUST 定义按任务规模选择编队的默认流程，至少覆盖小任务、中任务与多线战役三类场景。
- FR-005: 系统 MUST 定义多 Agent 并行时的文件边界、责任边界与冲突规避规则。
- FR-006: 系统 MUST 定义任务收口流程，包含验证、文档同步、longrun 同步与最终对外汇报责任分配。
- FR-007: 系统 MUST 明确说明该 feature 属于项目执行治理，不直接引入运行时代码功能。
- FR-008: 系统 MUST 把这套制度同步到 `specs/`、`docs/runbooks/` 与 `longrun/` 三个长期记录面。

## Non-Goals

- 不在本 feature 中实现新的 Agent 基础设施、队列系统或自动调度程序。
- 不在本 feature 中修改 UI、安装脚本、vendor runtime 或平台 companion 行为。
- 不把所有任务都强制改成多 Agent；单点小修仍允许最小编队执行。

## Risk Assessment

| 风险 | 等级 | 缓解措施 |
|------|------|---------|
| 固定职责写得过死，后续任务形态变化时不够灵活 | 中 | 允许临时扩编，并把固定职责定义为默认制度而非唯一制度 |
| 多 Agent 同时修改相邻文档，仍可能产生冲突 | 低 | 明确“同轮并行不改同一文件集”，由总司令做最终总装 |
| 总司令过度下放导致验收缺位 | 中 | 明确最终验收、风险接受与对外汇报必须由总司令统一负责 |
| 文档记录与真实执行习惯漂移 | 中 | 要求每次 feature 完成后同步更新 longrun 记录与 runbook |

## Success Criteria

1. 仓内存在 `specs/013-commander-orchestration/{spec,plan,tasks}.md`。
2. 仓内存在 `docs/runbooks/F-019-commander-orchestration.md`，明确固定编制、临时扩编、冲突规避与收口规则。
3. `longrun/workspaces/opensparrow-unified/feature_list.json` 新增 `F-019` 条目。
4. `longrun/workspaces/opensparrow-unified/claude-progress.txt` 追加本轮制度落盘记录，并明确“本轮不涉及运行时代码改动”。
