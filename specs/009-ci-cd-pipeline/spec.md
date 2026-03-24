# Feature Specification: CI/CD Pipeline Baseline

**Feature Branch**: `009-ci-cd-pipeline`  
**Created**: 2026-03-24  
**Status**: Implementing  
**Input**: 用户要求为 `opensparrow` 统一真源仓建立首个 GitHub Actions CI 工作流，覆盖 shell 语法、Node 语法、Docker compose 渲染和仓库健康检查，并补齐 spec/runbook/longrun 记录。

## Context & References

- `AGENTS.md`
- `.specify/memory/constitution.md`
- `longrun/workspaces/opensparrow-unified/feature_list.json`
- `docs/legacy-archive-freeze-20260323.md`
- `docs/runbooks/F-007-legacy-archive-docker-baseline.md`
- `deploy/docker/docker-compose.yml`
- `ui/server.mjs`

## User Stories

### User Story 1 - 维护者需要基础 CI 门槛（P1)

作为维护者，我需要仓库在 push 到 `main` 和提交 PR 时自动执行基础校验，这样 shell、Node、Docker 配置和仓库冻结约束不会在 review 之外静默漂移。

**Acceptance**:

1. `.github/workflows/ci.yml` 存在，并在 `push` 到 `main` 与 `pull_request` 时触发。
2. 工作流至少包含 `shell-lint`、`node-check`、`docker-validate`、`repo-health` 四个 job。
3. 当前主干代码在本地可完成同等检查。

### User Story 2 - 团队需要文档化的 CI 维护入口（P1)

作为团队成员，我需要有 spec、task 和 runbook 说明这个 CI 做了什么、不做什么，以及新增检查时该如何扩展。

**Acceptance**:

1. `specs/009-ci-cd-pipeline/` 下存在 `spec.md`、`plan.md`、`tasks.md`。
2. `docs/runbooks/F-010-ci-cd-pipeline.md` 说明触发条件、job 内容、本地等价命令与故障排查。
3. `longrun/workspaces/opensparrow-unified/feature_list.json` 与 `claude-progress.txt` 已同步。

## Functional Requirements

- FR-001：新增 `.github/workflows/ci.yml`，触发条件为 `push` 到 `main` 与 `pull_request`。
- FR-002：`shell-lint` job 必须用 `find` + `xargs bash -n` 检查指定 shell / `.command` 路径。
- FR-003：`node-check` job 必须在 Node `18.x` 下执行 `node --check ui/server.mjs`。
- FR-004：`docker-validate` job 必须执行 `docker compose -f deploy/docker/docker-compose.yml config`。
- FR-005：`repo-health` job 必须校验 `longrun/workspaces/opensparrow-unified/feature_list.json` 为合法 JSON，`scripts/verify-legacy-freeze.sh` 可执行且通过，并验证冻结标记文件存在。
- FR-006：新增 runbook 说明各 job 的职责、本地等价命令和常见失败原因。
- FR-007：新增 `F-010` 到 unified feature list，并在 progress log 记录本轮实现与验证证据。

## Non-Goals

- 不在本次实现任何 deploy/CD 发布动作。
- 不在本次引入单元测试框架、lint framework 或 secrets scanning。
- 不在本次修改 `ui/`、`scripts/`、`deploy/docker/` 等既有运行时代码。

## Success Criteria

1. `.github/workflows/ci.yml` 存在，并定义四个要求的 job。
2. 本地可跑通：shell `bash -n`、`node --check`、`docker compose config`、`verify-legacy-freeze.sh`、JSON 校验。
3. `specs/009-ci-cd-pipeline/`、`docs/runbooks/F-010-ci-cd-pipeline.md`、`feature_list.json`、`claude-progress.txt` 已同步。
