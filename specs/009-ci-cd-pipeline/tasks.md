# Tasks: CI/CD Pipeline Baseline

**Input**: `specs/009-ci-cd-pipeline/spec.md`, `specs/009-ci-cd-pipeline/plan.md`

## Phase 1: Spec & Documentation

- [x] T001 新增 `specs/009-ci-cd-pipeline/spec.md`
- [x] T002 新增 `specs/009-ci-cd-pipeline/plan.md`
- [x] T003 新增 `specs/009-ci-cd-pipeline/tasks.md`
- [x] T004 新增 `docs/runbooks/F-010-ci-cd-pipeline.md`

## Phase 2: Workflow Implementation

- [x] T005 新增 `.github/workflows/ci.yml`
- [x] T006 实现 `shell-lint` job（`find` + `xargs bash -n`）
- [x] T007 实现 `node-check` job（Node `18.x` + `node --check`）
- [x] T008 实现 `docker-validate` job（`docker compose config`）
- [x] T009 实现 `repo-health` job（JSON + freeze verify + marker file）

## Phase 3: Longrun Sync

- [x] T010 在 unified `feature_list.json` 新增 `F-010`
- [x] T011 在 unified `claude-progress.txt` 记录本轮实现与验证证据

## Phase 4: Validation

- [x] T012 本地校验 workflow YAML 结构
- [x] T013 本地执行 shell 语法检查链
- [x] T014 本地执行 `node --check ui/server.mjs`
- [x] T015 本地执行 `docker compose -f deploy/docker/docker-compose.yml config`
- [x] T016 本地执行 repo health 检查
