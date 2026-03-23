# Feature Specification: Build / Export Dist Closure

**Feature Branch**: `008-build-export-dist-closure`  
**Created**: 2026-03-23  
**Status**: Implementing  
**Input**: 用户明确要求执行 W-002：审查并收口 `longrun/workspaces/openclaw-usb-portable/execution/scripts/` 的 build/export 脚本，确保输出改为根级 `dist/`，并且导出时只从 canonical 根路径取源，不再依赖 frozen 目录、缺失模板目录或本机全局 runtime。

## Context & References

- `AGENTS.md`
- `.specify/memory/constitution.md`
- `docs/项目持久化说明.md`
- `docs/legacy-archive-freeze-20260323.md`
- `longrun/workspaces/opensparrow-unified/*`
- `longrun/workspaces/openclaw-usb-portable/execution/scripts/*`
- `longrun/workspaces/openclaw-usb-portable/execution/docs/boundary-freeze-migration-matrix-20260323.md`

## User Stories

### User Story 1 - 维护者需要稳定的 `dist/` 导出落点（P1）

作为维护者，我需要 build/export 脚本把生成物统一写到根级 `dist/`，而不是继续写回 workspace 下的历史 `execution/export` 或不存在的 `execution/delivery-pack` 路径。

**Acceptance**:

1. `build-delivery-pack.sh` 输出目录位于 `dist/usb-pack/`。
2. Mac / Windows handoff copy 输出目录位于 `dist/handoff/`。
3. 脚本不再依赖不存在的 `execution/delivery-pack/{mac,windows}` 模板目录。

### User Story 2 - 维护者需要只从 canonical 根路径取源（P1）

作为维护者，我需要交付包和 handoff copy 的源资产只来自根级 canonical 目录，而不是 frozen snapshot、本机全局 npm 安装或临时下载物。

**Acceptance**:

1. 入口 wrapper 来自 `platforms/mac/wrappers/` 与 `platforms/windows/wrappers/`。
2. 核心脚本来自 `scripts/openclaw-usb/`。
3. 文档与 runbook 来自根级 `docs/usb-pack/` 与 `docs/runbooks/`。
4. handoff copy 的 bundled runtime 来自 `vendor/`，不再依赖 `$HOME/.npm-global` 或 Node 官网下载。

### User Story 3 - 团队需要可验证的 build/export 收口证据（P1）

作为统一仓维护者，我需要 W-002 的修改有 spec、文档、runbook 与 progress 记录，便于后续 code review 和下一轮任务继续衔接。

**Acceptance**:

1. `specs/008-build-export-dist-closure/` 包含 `spec.md`、`plan.md`、`tasks.md`。
2. 受影响的脚本说明 / 交付说明 / runbook 已同步到 `dist/` 与 canonical 路径。
3. `bash -n` 校验已执行并记录到 unified / portable handoff。

## Functional Requirements

- FR-001：`build-delivery-pack.sh` 必须把 staging 包输出到根级 `dist/usb-pack/openclaw-usb-pack/`。
- FR-002：`create-mac-handoff-copy.sh` 与 `create-windows-handoff-copy.sh` 必须把 handoff copy 输出到根级 `dist/handoff/`。
- FR-003：build/export 脚本必须从 `platforms/`、`vendor/`、`scripts/`、`ui/`、`docs/` 等 canonical 根路径取源。
- FR-004：Windows 交付包所需的 `install-local-feishu.ps1` / `harden-local-feishu.ps1` 启动桥接脚本，必须落到 canonical `platforms/windows/wrappers/`，不再依赖 frozen 目录中的旧模板。
- FR-005：runtime 打包逻辑必须优先复用 `vendor/mac-openclaw/` 与 `vendor/windows-openclaw/`，不再依赖本机全局 OpenClaw 安装或下载 Node 运行时。
- FR-006：build/export 相关文档、runbook 与 unified progress 必须同步更新。

## Non-Goals

- 不修改 `vendor/` 中的二进制内容。
- 不修改 frozen legacy 目录的任何文件。
- 不在本阶段扩展新的平台入口契约或重写 UI / installer 核心语义。

## Success Criteria

1. `bash longrun/workspaces/openclaw-usb-portable/execution/scripts/build-delivery-pack.sh` 可在 `dist/usb-pack/openclaw-usb-pack/` 产出 staging 包。
2. `bash longrun/workspaces/openclaw-usb-portable/execution/scripts/create-mac-handoff-copy.sh` 与 `create-windows-handoff-copy.sh` 的导出根位于 `dist/handoff/`。
3. `bash -n longrun/workspaces/openclaw-usb-portable/execution/scripts/*.sh` 与 `bash -n longrun/workspaces/openclaw-usb-portable/execution/scripts/lib/*.sh` 通过。
4. unified / portable workspace 的 feature list、progress、相关说明文档保持同步。
