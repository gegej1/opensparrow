# Feature Specification: codeSPEC Template Ingestion & Repo Cleanup Mapping

**Feature Branch**: `015-codespec-template-ingestion`  
**Created**: 2026-04-14  
**Status**: Draft  
**Input**: 用户要求“参考 `/Users/eduardogan/Desktop/GHJProject/codeSPEC`，把这个项目的代码模板移动到当前 `opensparrow` 仓库，用于后续清洗和重整；同时不准影响 source 项目本身”。

## Context & References

- 根级约束：`AGENTS.md`
- 项目宪法：`.specify/memory/constitution.md`
- 持久化说明：`docs/项目持久化说明.md`
- 统一工作区规格：`longrun/workspaces/opensparrow-unified/app_spec.md`
- 当前 feature 清单：`longrun/workspaces/opensparrow-unified/feature_list.json`
- 当前长期进度：`longrun/workspaces/opensparrow-unified/claude-progress.txt`
- 参考 source 项目：`/Users/eduardogan/Desktop/GHJProject/codeSPEC`
- 参考模板目录：`/Users/eduardogan/Desktop/GHJProject/codeSPEC/UnifiedFramework/`
- 参考 seed 目录：`/Users/eduardogan/Desktop/GHJProject/codeSPEC/spec规范/`

## User Stories & Testing

### User Story 1 - 在不触碰 source 项目的前提下导入可复用模板（Priority: P1)

作为 OpenSparrow 统一仓维护者，我希望把 `codeSPEC` 中真正可复用、且当前仓尚未具备的模板资产导入到当前仓库内，供后续清洗与重整直接参考，同时确保 `/Users/eduardogan/Desktop/GHJProject/codeSPEC` 不被修改。

**Independent Test**: 运行导入脚本后，当前仓新增独立的 `codeSPEC` 模板参考目录；source 目录未被写入；导入结果只包含约定的模板文件，不包含 `node_modules`、实验残留或 source-specific 审计文件。

### User Story 2 - 后续刷新必须是可重复、可审计的（Priority: P1)

作为未来继续维护这个统一仓的协作者，我希望本次迁入不是一次性手工拷贝，而是有明确的同步脚本、导入范围和跳过清单，这样未来刷新模板时可以安全复用，不会把 `codeSPEC` 的 authoring 面和当前仓的权威面混在一起。

**Independent Test**: `scripts/import-codespec-template.sh` 支持从指定 source 路径重建当前仓的模板镜像；测试可证明它只同步允许的文件，并保留当前仓本地说明文档。

### User Story 3 - 当前仓要有清晰的“引用而非接管”边界（Priority: P2)

作为当前项目的总司令/协作者，我希望仓内存在清晰的说明文档，明确哪些 `codeSPEC` 资产被引入、哪些被刻意跳过、以及它们如何映射到当前仓已有的 `.specify`、`.codex`、`longrun`、runbook 体系，从而避免把参考模板误当成新的权威规则层。

**Independent Test**: 阅读新增的 reference README / runbook，即可判断导入边界、目标落点、刷新命令，以及为什么不直接覆盖当前仓已有 `.specify/.codex/scripts/codex` 与现有治理文档。

## Requirements

### Functional Requirements

- **FR-001**: 必须新增一个可重复执行的导入脚本，用于从 `codeSPEC` source 路径同步一组白名单模板到当前仓。
- **FR-002**: 导入脚本默认 source 路径必须指向 `/Users/eduardogan/Desktop/GHJProject/codeSPEC`，同时允许通过命令行参数传入其他 source 路径以便测试或未来刷新。
- **FR-003**: 本次导入必须只同步经过策展的 `UnifiedFramework` 模板文件，而不是整仓拷贝。
- **FR-004**: 导入结果必须落在当前仓一个独立、可识别的 reference 路径下，避免与当前权威目录（如 `.specify/`、`.codex/`、`longrun/`、`docs/runbooks/`）混写。
- **FR-005**: 当前仓必须新增说明文档，明确本次导入的白名单、跳过清单、对应关系与刷新方式。
- **FR-006**: 必须明确声明并落实：本 feature 不允许修改 `/Users/eduardogan/Desktop/GHJProject/codeSPEC` 中任何文件。
- **FR-007**: 必须明确跳过以下类型内容：`node_modules/`、实验/回放残留、source-specific 审计文档、以及当前仓已有等价实现的 `.specify/.codex/scripts/codex` authoring 面。
- **FR-008**: 必须把本次导入动作同步到 unified longrun 的 `feature_list.json` 与 `claude-progress.txt`。
- **FR-009**: 必须提供至少一种自动化验证，证明导入脚本只复制允许文件，并且不会覆盖当前仓本地说明文档。
- **FR-010**: 必须在当前仓对外可见的入口文档中增加 `codeSPEC` 模板参考位点，方便后续清洗/重整时直接查阅。
- **FR-011**: 必须把 `codeSPEC` 中对 `longrun` 边界更清晰的说明，同步吸收到当前仓活跃的 `longrun` 文档中，避免项目事实层与 feature / execution 层混淆。

### Non-Goals

- **NG-001**: 本 feature 不修改 `codeSPEC` source 项目的任何文件、目录、配置或历史记录。
- **NG-002**: 本 feature 不把 `codeSPEC/spec规范/.specify`、`.codex/prompts`、`scripts/codex` 直接覆盖到当前仓现有实现上。
- **NG-003**: 本 feature 不导入 `AgentTeam`、`memory_context_recovery`、`longterm/mcp`、`node_modules` 或其他实验/残留目录。
- **NG-004**: 本 feature 不改变 OpenSparrow 运行时代码行为，不修改 `ui/`、`platforms/`、`vendor/` 的业务逻辑。
- **NG-005**: 本 feature 不把导入的参考模板声明为当前仓新的 authority source；项目权威仍由当前仓本地 `AGENTS.md`、constitution、specs、runbook、longrun 决定。

## Success Criteria

- **SC-001**: `specs/015-codespec-template-ingestion/` 下存在 `spec.md`、`plan.md`、`tasks.md`。
- **SC-002**: 当前仓新增 `scripts/import-codespec-template.sh`，可从指定 source 路径重建 `codeSPEC` 模板镜像。
- **SC-003**: 当前仓新增 `docs/reference/codeSPEC-template/`，其中包含本地说明文档与导入的 `UnifiedFramework` 模板镜像。
- **SC-004**: 自动化测试证明脚本只同步白名单文件，并保留当前仓本地 `README`/说明文档不被覆盖。
- **SC-005**: `README.md`、`longrun/README.md`、`longrun/CHECKLIST.md`、`longrun/METHOD.zh-CN.md`、`longrun/workspaces/opensparrow-unified/feature_list.json`、`longrun/workspaces/opensparrow-unified/claude-progress.txt` 已同步本次导入与边界说明。
- **SC-006**: `./longrun/workspaces/opensparrow-unified/init.sh` 与 `python3 longrun/scripts/progress_report.py longrun/workspaces/opensparrow-unified/feature_list.json` 继续可运行，证明长期骨架未被破坏。
