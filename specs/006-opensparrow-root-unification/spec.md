# Feature Specification: OpenSparrow Root Unification Execution

**Feature Branch**: `006-opensparrow-root-unification`  
**Created**: 2026-03-23  
**Status**: In Progress  
**Input**: 用户决定把统一真源工作根从原先候选的 `openclawNative/` 调整为 `/Users/eduardogan/Desktop/GHJProject/opensparrow`，要求先完成 openclawNative long-term/spec 上下文迁移与合并，再结合 Claude 的跨平台调研结果生成并落盘新的多平台方案，随后直接在新目录内执行第一阶段收口。

## Context & References

- 已有规划：`specs/005-opensparrow-cleanup-containerization/`
- 已有风险研究：`longrun/workspaces/openclaw-usb-portable/execution/docs/cross-platform-unification-risk-assessment-20260323.md`
- 新增深潜调研：`longrun/workspaces/openclaw-usb-portable/execution/docs/cross-platform-unified-repo-risk-deep-dive-20260323.md`
- 新增迁移矩阵：`longrun/workspaces/openclaw-usb-portable/execution/docs/boundary-freeze-migration-matrix-20260323.md`
- 导入上下文：`longrun/workspaces/openclaw-native/` 与 `longrun/workspaces/openclaw-usb-portable/`

## User Stories & Testing

### User Story 1 - 团队需要一个新的唯一工作根（Priority: P1)

作为维护者，我希望以后直接在 `opensparrow/` 根目录工作，而不是在 `openclawNative/` 与 `opensparrow_win/feishu-source/` 之间来回切换。

**Independent Test**: 根目录存在统一的 `AGENTS.md`、`.specify/`、`longrun/`、`specs/`、`platforms/`、`vendor/`，并能通过一个统一 workspace 初始化。

### User Story 2 - 旧长期上下文必须迁入并可继续使用（Priority: P1)

作为后续接手者，我希望 `openclaw-native` 与 `openclaw-usb-portable` 的长期上下文都保留在新根目录，并已适配新的路径结构。

**Independent Test**: 两个 legacy workspace 在新根目录中存在，对应 `init.sh` 与文档路径不再指向旧根目录。

### User Story 3 - 多平台方案需要统一落盘（Priority: P1)

作为项目负责人，我希望新的多平台统一仓方案同时出现在 longrun 文档与 spec 文档里，后续可以直接按该方案执行。

**Independent Test**: 仓库中存在新的 spec/plan/tasks，以及一份对外可读的统一方案文档。

### User Story 4 - 第一阶段执行必须直接开始（Priority: P1)

作为执行者，我希望不是只写方案，而是完成第一阶段的真实落地：目录收口、规则文件初始化、source-of-truth 迁入与根级工作区建好。

**Independent Test**: `platforms/`、`vendor/`、`scripts/openclaw-usb/`、`ui/`、`docs/`、`specs/` 已在根目录就位，且根级 git/bootstrap 文件已存在。

## Requirements

### Functional Requirements

- **FR-001**: `opensparrow/` 根目录必须成为新的统一真源工作根。
- **FR-002**: 必须把 `openclawNative` 的 long-term/spec 骨架迁入根目录，并适配新路径结构。
- **FR-003**: 必须把 `opensparrow_win/feishu-source` 的 source-of-truth 资产迁入根目录。
- **FR-004**: 必须新增一份基于最新调研结果的多平台统一仓执行方案，并同时落在 `docs/`、`specs/` 与 `longrun/` 可引用的结构中。
- **FR-005**: 必须创建根级 `.gitattributes` 与 `.gitignore`，用于收口换行符、二进制、legacy 目录和生成物。
- **FR-006**: 必须创建新的 `opensparrow-unified` workspace，作为后续唯一推荐入口。
- **FR-007**: 必须保留 legacy workspace，但要更新其根路径说明、init 校验路径和 handoff 指引。
- **FR-008**: 必须明确 `opensparrow_win/`、`_push_opensparrow_win/`、`openclaw-usb-feishu-delivery/`、`openclawtest/` 的冻结状态。
- **FR-009**: 必须完成第一阶段的实际执行，不停留在纯规划。
- **FR-010**: 容器化基线仍作为后续阶段，不在本 feature 中强行实现。

## Success Criteria

- **SC-001**: 统一工作根已切换到 `opensparrow/`。
- **SC-002**: 两套旧上下文已迁入并能在新根目录中继续工作。
- **SC-003**: 新的多平台方案已在 `docs/`、`specs/`、`longrun/` 中都有落点。
- **SC-004**: 根目录已具备 `platforms/`、`vendor/`、`scripts/openclaw-usb/`、`ui/`、`deploy/docker/`、`dist/` 结构。
- **SC-005**: 根级 git/bootstrap 规则文件已到位。
- **SC-006**: 统一 workspace 初始化与语法验证可以执行。
