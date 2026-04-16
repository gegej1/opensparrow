# Feature Specification: codeSPEC Framework Full Adaptation for OpenSparrow

**Feature Branch**: `016-codespec-framework-adaptation`  
**Created**: 2026-04-14  
**Status**: Draft  
**Input**: 用户要求“继续迁移进来，最后要用我的 Spec 作为 Sparrow 的开发框架底层，完全迁移并适配完成，之后再开始优雅地改这个项目”。

## Context & References

- 根级约束：`AGENTS.md`
- 项目宪法：`.specify/memory/constitution.md`
- 项目持久化说明：`docs/项目持久化说明.md`
- 统一工作区规格：`longrun/workspaces/opensparrow-unified/app_spec.md`
- 当前长期记录：`longrun/workspaces/opensparrow-unified/feature_list.json`
- 当前长期进度：`longrun/workspaces/opensparrow-unified/claude-progress.txt`
- 已落地参考镜像：`docs/reference/codeSPEC-template/README.md`
- source 项目：`/Users/eduardogan/Desktop/GHJProject/codeSPEC`
- source 关键目录：
  - `/Users/eduardogan/Desktop/GHJProject/codeSPEC/UnifiedFramework/`
  - `/Users/eduardogan/Desktop/GHJProject/codeSPEC/AgentTeam/`
  - `/Users/eduardogan/Desktop/GHJProject/codeSPEC/longterm/longrun/`

## User Stories & Testing

### User Story 1 - 当前仓要拥有可直接执行的底层框架栈（Priority: P1)

作为 OpenSparrow 的维护者，我希望当前仓不只是“参考了 `codeSPEC`”，而是已经在本地形成一套可直接执行的底层开发框架栈，明确项目规则层、feature 交付层、项目记忆层、执行方法层与协作治理层的权威边界。

**Independent Test**: 阅读当前仓新增的 governance 文档、`AGENTS.md` 与 constitution，即可判断：开发时先看什么、谁负责 feature 定义、谁负责项目事实、谁负责执行方法、谁负责多 Agent 派工，且不会出现双 authority。

### User Story 2 - 总司令 / 协作者要有可复用的 onboarding 与 dispatch 模板（Priority: P1)

作为后续会在 OpenSparrow 上持续开发的总司令或协作者，我希望 `codeSPEC/AgentTeam` 中真正有复用价值的 onboarding / dispatch / quick-reference 模板被本地化适配到当前仓，这样新会话一进来就能按统一框架接管、派工、收口，而不是每次重新发明流程。

**Independent Test**: 当前仓存在本地化的 onboarding SOP、dispatch templates 和 quick reference；阅读后可直接用于接手项目和指挥后续 feature 开发。

### User Story 3 - 当前仓的 longrun / prompt scaffold 要与底层框架保持一致（Priority: P2)

作为需要长期维护项目事实与 feature 交付链的协作者，我希望 `longrun` 的 prompt scaffold、会话脚手架和 reference import 范围都与新的底层框架一致，这样 session 初始化、continuation handoff 和 reference 刷新都不会再与 `specs/`、`superpowers`、治理文档发生口径冲突。

**Independent Test**: `longrun/templates/initializer_prompt.template.md`、`longrun/templates/coding_prompt.template.md`、reference import 脚本/测试与说明文档都能反映新的 authority boundary 和导入范围。

## Requirements

### Functional Requirements

- **FR-001**: 必须在当前仓新增一组本地化治理文档，明确 OpenSparrow 的底层框架栈与 authority order。
- **FR-002**: 这组治理文档至少要覆盖：框架总览、项目接管 SOP、派工模板、速查表。
- **FR-003**: 新治理文档必须以当前仓语境重写，不得原样把 `codeSPEC` 的旧路径与旧项目语境生搬硬拷。
- **FR-004**: `AGENTS.md` 与 `.specify/memory/constitution.md` 必须引用新的治理文档，使其成为当前仓显式可发现的底层框架入口。
- **FR-005**: `longrun/templates/initializer_prompt.template.md` 与 `longrun/templates/coding_prompt.template.md` 必须补齐 authority boundary，使其与当前仓的 `specs/` / `longrun` / `superpowers` / governance 文档口径一致。
- **FR-006**: 参考导入脚本必须扩展为可镜像 `AgentTeam` 的高价值模板与 `UnifiedFramework/12-Superpower-Execution-Bridge.md`，但仍保持白名单同步和 source 只读。
- **FR-007**: 导入脚本的自动化测试必须同步扩展，证明新增 reference 范围会被正确导入，且本地说明文档仍不会被覆盖。
- **FR-008**: 必须保留并强化“不修改 source 项目”的边界说明。
- **FR-009**: 必须把本轮“底层框架适配完成”的状态同步到 `README.md`、`feature_list.json`、`claude-progress.txt` 与相关 runbook。
- **FR-010**: 本轮迁移完成后，当前仓应具备作为后续产品开发底座的最小条件：规则入口清晰、feature 交付路径清晰、项目记忆路径清晰、调度模板清晰。

### Non-Goals

- **NG-001**: 本 feature 不修改 `codeSPEC` source 项目本身。
- **NG-002**: 本 feature 不把 `codeSPEC` 的实验区、研究区、`node_modules`、`mcp`、`sources`、回放残留迁入当前仓。
- **NG-003**: 本 feature 不要求立刻开始大规模改 `ui/`、`platforms/`、`scripts/openclaw-usb/` 的产品逻辑；当前阶段先完成开发框架底座适配。
- **NG-004**: 本 feature 不允许在当前仓引入两套平行的 Commander / governance authority。

## Success Criteria

- **SC-001**: `specs/016-codespec-framework-adaptation/` 下存在 `spec.md`、`plan.md`、`tasks.md`。
- **SC-002**: 当前仓新增本地化治理文档目录，并包含框架栈总览、接管 SOP、派工模板、速查表。
- **SC-003**: `AGENTS.md`、constitution、`README.md`、`longrun` prompt scaffold 已与新的底层框架栈对齐。
- **SC-004**: `scripts/import-codespec-template.sh` 与 `scripts/tests/import-codespec-template.test.mjs` 已扩展到新的白名单范围并通过验证。
- **SC-005**: `docs/reference/codeSPEC-template/` 的导入范围说明和 upstream 镜像反映新的 reference 范围。
- **SC-006**: `longrun/workspaces/opensparrow-unified/feature_list.json` 与 `claude-progress.txt` 已记录“底层框架适配完成，可作为后续产品开发底座”。
