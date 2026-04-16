# Feature Specification: Commander Orchestration Governance

**Feature Branch**: `013-commander-orchestration-governance`  
**Created**: 2026-04-09  
**Status**: In Progress  
**Input**: 用户确认采用“总司令 + 固定 5 子 Agent + 可临时扩编”的长期工作方式，并要求把该制度正式记录到 OpenSparrow 统一仓中，作为后续会话默认执行基线。

## Context & References

- 根级约束：`AGENTS.md`
- 项目宪法：`.specify/memory/constitution.md`
- 持久化说明：`docs/项目持久化说明.md`
- 统一工作区规格：`longrun/workspaces/opensparrow-unified/app_spec.md`
- 当前 feature 清单：`longrun/workspaces/opensparrow-unified/feature_list.json`
- 当前长期进度：`longrun/workspaces/opensparrow-unified/claude-progress.txt`
- 本轮 runbook：`docs/runbooks/F-019-commander-orchestration-governance.md`

## User Stories & Testing

### User Story 1 - 总司令需要稳定可复用的派工边界（Priority: P1)

作为当前 OpenSparrow 项目的总司令，我希望存在一套长期固定的多 Agent 编制与职责边界，这样我后续面对新需求时可以优先做任务拆解、派工、审阅和集成，而不是默认自己下场做主力开发。

**Independent Test**: 新会话只读取本 spec、plan、tasks 与 runbook，就能知道固定 5 子 Agent 各自负责什么、何时扩编、何时由总司令介入。

### User Story 2 - 后续协作者需要可执行的调度 SOP（Priority: P1)

作为未来接手该仓库的协作者，我希望这套治理方案不仅出现在对话里，还同步落盘到 spec、runbook 与 unified longrun 记录中，这样后续执行时不会因口径漂移而重新发明流程。

**Independent Test**: 仓库中存在完整的 `spec.md`、`plan.md`、`tasks.md`、runbook，以及 feature list / progress 记录；阅读后即可按小任务、中任务、战役级任务三类模式执行。

## Requirements

### Functional Requirements

- **FR-001**: 必须定义固定 5 子 Agent 编制：`claudecodeA`、`codexA`、`codexB`、`codexC`、`claudecodeB`。
- **FR-002**: 必须定义总司令职责边界：总司令默认负责需求拆解、优先级、派工、审阅、集成决策、验收与记录同步，而非主力代码实现。
- **FR-002A**: 必须明确“总司令”是会话级角色而非固定绑定某个特定 Agent / 模型；若用户在新会话中重新指定总司令，则以用户最新指定为准，历史记录只作为背景，不直接构成当前执行约束。
- **FR-003**: 必须定义 `Cloud Code` 与 `CodeX` 的职责分离：前者偏规划、文档、验收口径；后者偏实现、调试、验证。
- **FR-004**: 必须定义固定 5 子 Agent 的长期职责卡，说明各自主要输入、输出与不应承担的工作。
- **FR-005**: 必须允许总司令在任务并行面扩张时临时增派 1–3 个特遣 Agent，并记录推荐角色类型与触发条件。
- **FR-006**: 必须定义默认派工模式，至少覆盖“小任务”“中任务”“多线战役”三种编队。
- **FR-007**: 必须定义冲突规避规则，包括文件所有权、同文件禁并行修改、审阅顺序、失败升级路径。
- **FR-008**: 必须定义每次任务完成后的收口动作，至少覆盖 `specs/`、`docs/runbooks/`、`feature_list.json`、`claude-progress.txt` 的同步要求。
- **FR-009**: 必须把本制度以 runbook 形式写入 `docs/runbooks/`，使其成为未来会话可直接引用的操作手册。
- **FR-010**: 本 feature 必须明确属于“项目执行治理”与“长期协作制度”建设，不要求修改任何 OpenSparrow 运行时代码。

### Non-Goals

- **NG-001**: 本 feature 不绑定具体某一种外部 Agent 平台或供应商实现细节。
- **NG-002**: 本 feature 不要求为所有任务都强制启用全部 5 个固定 Agent。
- **NG-003**: 本 feature 不负责修改 `ui/`、`platforms/`、`scripts/`、`vendor/` 内的运行时代码行为。
- **NG-004**: 本 feature 不把临时扩编角色固化为永久编制；扩编仅按任务需要启用。

## Success Criteria

- **SC-001**: `specs/013-commander-orchestration-governance/` 下存在 `spec.md`、`plan.md`、`tasks.md`。
- **SC-002**: `docs/runbooks/F-019-commander-orchestration-governance.md` 存在，且包含固定职责卡、派工模式、扩编规则、冲突规避与收口要求。
- **SC-003**: `longrun/workspaces/opensparrow-unified/feature_list.json` 新增 `F-019` 条目。
- **SC-004**: `longrun/workspaces/opensparrow-unified/claude-progress.txt` 追加本轮制度落盘记录，并明确本轮未修改运行时代码。
- **SC-005**: 统一工作区初始化与进度汇总脚本可在当前仓库状态下继续执行，证明长期记录链未被破坏。
