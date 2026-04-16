# Feature Specification: Mem0 Project Memory Integration

**Feature Branch**: `028-mem0-project-memory-integration`  
**Created**: 2026-04-15  
**Status**: In Progress  
**Input**: 用户要求以最少改动、最快落地、零复杂二次开发的方式，把 Mem0 接入当前 OpenSparrow 项目，并把现有长期有效信息整理为可工作的项目长期记忆。

## Context & References

- 根级规则：`AGENTS.md`
- 项目宪法：`.specify/memory/constitution.md`
- 框架栈：`docs/governance/framework-stack.md`
- 持久化说明：`docs/项目持久化说明.md`
- 治理入口：`docs/governance/README.md`
- 统一工作区画像：`longrun/workspaces/opensparrow-unified/app_spec.md`
- 统一工作区状态：`longrun/workspaces/opensparrow-unified/feature_list.json`
- 统一工作区进度：`longrun/workspaces/opensparrow-unified/claude-progress.txt`
- 相关冻结边界：
  - `specs/003-opensparrow-ui-reset-hardening/spec.md`
  - `specs/014-mac-arm64-installer-hardening/spec.md`
  - `specs/026-mac-first-platform-parity/spec.md`
  - `specs/026-mac-first-platform-parity/mac-truth-inventory.md`
  - `specs/027-mac-ui-first-release-readiness/spec.md`
  - `docs/runbooks/F-005-ui-install-reset.md`
  - `docs/runbooks/F-019-commander-orchestration-governance.md`

## User Stories & Testing

### User Story 1 - Codex 侧必须立即可用（Priority: P1)

作为当前项目维护者，我希望从今天开始在 Codex 侧具备可工作的 Mem0 长期记忆能力，这样后续新任务开始前可以先查历史记忆，结束后能写入 durable memory，而不必继续把所有长期信息只堆在 longrun 和对话里。

**Independent Test**: 本机 `~/.codex/config.toml` 已接入 Mem0；在不把 secret 写进 repo 的前提下，可以完成最小写入、搜索、读取（如支持则更新）验证。

### User Story 2 - 项目长期规则与长期事实必须被整理（Priority: P1)

作为接手该仓的协作者，我希望 repo 内原有规则、冻结边界、长期决策、长期经验被清楚分成 A/B/C 三类，这样知道哪些应该进规则文件、哪些应该进 Mem0、哪些只保留原位不导入。

**Independent Test**: `docs/memory-setup.md` 与 `memory/mem0_import.json` 明确说明 A/B/C 分类、导入策略、来源文件和不导入原因。

### User Story 3 - sidecar 接入不得扰动 F-027 主线（Priority: P1)

作为 Commander，我希望这次接入是独立 tooling sidecar，不改动当前 Mac UI-first 首发主线实现，也不推进 Windows 线。

**Independent Test**: 改动面限制在规则、memory 文档、导入清单、必要的本机 Mem0/Codex 配置，以及最小 longrun 记账；不触碰 F-027 实现写面。

## Requirements

### Functional Requirements

- **FR-001**: 开始前必须检查 `MEM0_API_KEY`；若不存在，必须立即停止并仅返回 `MEM0_API_KEY missing`。
- **FR-002**: Mem0 namespace 必须固定使用 `user_id = opensparrow-memory`，并在支持时使用 `app_id = opensparrow`、`project_id = opensparrow`。
- **FR-003**: 所有导入、检索、写入、更新都必须以 `opensparrow-memory` 为主 user scope，并在 metadata 中显式写 `project = opensparrow`。
- **FR-004**: Codex 侧接入必须优先使用官方 Mem0 方案与 `~/.codex/config.toml` 的最少改动；不得把 secret 写入 repo。
- **FR-005**: 必须搜索 repo 中现有规则/知识/记忆来源，并至少覆盖治理文档、runbook、feature spec、longrun 台账、legacy workspace 画像。
- **FR-006**: 必须把候选内容分为三类：
  - `A` 永久规则类：写入项目规则文件；
  - `B` 长期经验类：整理后导入 Mem0；
  - `C` 过期/噪音类：明确标记为不导入。
- **FR-007**: `AGENTS.md` 必须新增 `## Memory Operating Rules`，至少覆盖检索先行、durable memory 类型、只写 durable facts、优先更新旧事实、禁止全文灌库、重大上下文丢失前写 `session_state`。
- **FR-008**: 如 repo 内存在 `CLAUDE.md` 或 `.claude/CLAUDE.md`，需同步同口径的 memory operating rules；若不存在，不为此任务额外制造冲突性规则文件。
- **FR-009**: 必须产出 `memory/mem0_import.json`，内容为去重、短句、可执行的 durable memory，而不是旧文档全文转存。
- **FR-010**: `memory/mem0_import.json` 的 metadata 至少包含 `project`、`type`、`source`、`source_file`、`status`、`import_batch`。
- **FR-011**: 必须补一份简短但可执行的 `docs/memory-setup.md`，说明接入方式、A/B/C 映射、后续写入策略、纠错方式、重新导入方法与验证方法。
- **FR-012**: 必须完成最小验收：`mem0 status`、`mem0 list --user-id opensparrow-memory`、`mem0 search "OpenSparrow authority order" --user-id opensparrow-memory`、最小 system test memory 的 add/search/get，以及当前接口支持时的 update。
- **FR-013**: 若当前环境能在新 Codex 会话中直接使用 Mem0 MCP，则必须补一条最小证据，证明 agent 侧至少能读到一条刚导入的项目记忆。
- **FR-014**: 本任务不得改动 F-027 的实现写面，不得推进 Windows 线，不得自研 memory backend、daemon、worker、cron、vector DB、webhook。
- **FR-015**: durable memory 中必须覆盖以下稳定项目事实：
  - authority order；
  - `AGENTS + constitution + specs + longrun` 的层级关系；
  - non-trivial 必须先走 `spec -> plan -> tasks`；
  - longrun 是 subordinate memory，不是 authority；
  - Commander mode 边界；
  - review / verification / closeout 分离；
  - packet attribution 规则；
  - PASS / DONE 必须依赖 fresh verification evidence；
  - unified repo 目录职责；
  - 冻结目录不再作为真源；
  - 真正的 `F-014 = wecom-channel-integration` 及其 passing 口径；
  - `F-024`、`F-025-A`、`F-025-B`、`F-026`、`F-027` 的冻结边界。
- **FR-016**: 用户/项目偏好必须作为 durable memory 处理：中文优先、Commander-only 协作、默认最小 agent 数量、不私自开 agent、保持星型拓扑、优先最快可落地/最少复杂度。

### Non-Goals

- **NG-001**: 不修改 `ui/`、`platforms/`、`scripts/openclaw-usb/`、`vendor/` 或任何 F-027 实现文件。
- **NG-002**: 不把所有历史文档全文导入 Mem0。
- **NG-003**: 不引入自建记忆服务、数据库、后台进程或双写体系。
- **NG-004**: 不把一次性聊天、命令回显、长日志、旧任务碎片写入 active memory。
- **NG-005**: 不把 packaged Mac candidate artifact 之类会变的会话状态误写成永久规则；必要时只作为 `session_state`。

## Success Criteria

- **SC-001**: Codex 本机配置已具备可工作的 Mem0 接入，且未把 secret 写入 repo。
- **SC-002**: `AGENTS.md` 已新增 `Memory Operating Rules`，口径与现有 authority order 不冲突。
- **SC-003**: `memory/mem0_import.json` 已生成，且内容为去重后的 durable memory，而不是全文 dump。
- **SC-004**: `docs/memory-setup.md` 已说明接入方式、A/B/C 分类、写入/纠错/重导/验证方法。
- **SC-005**: 至少一批项目长期记忆已成功写入 Mem0，并可通过 `opensparrow-memory` 检索到。
- **SC-006**: 验收输出能证明今天已经达到“可稳定使用的最低标准”。
