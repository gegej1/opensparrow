# Feature Specification: Legacy Archive Freeze & Docker Baseline

**Feature Branch**: `007-legacy-archive-docker-baseline`  
**Created**: 2026-03-23  
**Status**: Implementing  
**Input**: 用户已明确要求从 F-007 继续推进：先做 legacy 归档计划/执行，再开始 `deploy/docker/` 容器化基线，同时不强行统一 Mac / Windows 原生入口脚本。

## Context & References

- `docs/多平台统一仓方案-20260323.md`
- `specs/005-opensparrow-cleanup-containerization/*`
- `specs/006-opensparrow-root-unification/*`
- `longrun/workspaces/opensparrow-unified/*`
- `longrun/workspaces/openclaw-usb-portable/execution/runbooks/F-007-repo-cleanup-containerization.md`

## User Stories

### User Story 1 - 维护者需要可校验的 legacy 归档边界（P1）

作为维护者，我需要一个可以重复执行的冻结校验，而不只是“不要去改那些目录”的口头约定。

**Acceptance**:

1. 有 root-level 归档冻结说明，明确 legacy 目录的身份、允许动作和 canonical 去向。
2. 有脚本可以校验 frozen 目录、`.gitignore` 规则和 canonical 主目录是否齐全。
3. 归档执行先停在 logical archive，不在本阶段直接物理删除目录。

### User Story 2 - 维护者需要最小可运行的 Docker baseline（P1）

作为维护者，我需要在 `deploy/docker/` 里有一个能启动 UI、承接 profile bootstrap、并拉起 gateway 的最小基线。

**Acceptance**:

1. `deploy/docker/` 至少包含 `Dockerfile`、`docker-compose.yml`、`.env.example` 和入口脚本。
2. `docker compose config` 可通过。
3. `opensparrow-core` 启动后，可用 `curl http://127.0.0.1:19000/api/status` 拿到 HTTP 200。

### User Story 3 - 团队需要保留 native delivery（P1）

作为交付团队，我需要容器基线不破坏现有 Mac / Windows 原生入口与后续 build/export 收口方向。

**Acceptance**:

1. 文档明确写明 `.command`、`.cmd/.ps1` 继续保留。
2. Docker baseline 只统一共享逻辑和验证链，不要求 wrapper 语法统一。
3. 后续 build/export 仍以 native delivery 为并行产物链。

## Functional Requirements

- FR-001：新增 legacy 归档冻结说明文档。
- FR-002：新增 legacy 冻结校验脚本并接入 unified workspace init。
- FR-003：新增 `deploy/docker/` 最小基线文件与入口脚本。
- FR-004：容器 bootstrap 必须复用现有 `scripts/openclaw-usb/install-local-feishu.sh` 的共享配置逻辑，而不是复制一套配置实现。
- FR-005：`ui/server.mjs` 必须支持从环境变量读取 runtime root、UI port 和 gateway port，以适配容器运行时。

## Non-Goals

- 不在本阶段物理删除 frozen legacy 目录。
- 不在本阶段把 Mac / Windows wrapper 合并为单脚本。
- 不在本阶段完成 build/export 全收口。

## Success Criteria

1. `bash scripts/verify-legacy-freeze.sh` 通过。
2. `docker compose -f deploy/docker/docker-compose.yml config` 通过。
3. `docker compose -f deploy/docker/docker-compose.yml up -d --build opensparrow-core` 后，`/api/status` 返回 HTTP 200。
4. root/legacy workspace 的 feature list、progress log、runbook 都已同步。

