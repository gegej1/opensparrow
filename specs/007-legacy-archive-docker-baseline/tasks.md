# Tasks: Legacy Archive Freeze & Docker Baseline

**Input**: `specs/007-legacy-archive-docker-baseline/spec.md`, `specs/007-legacy-archive-docker-baseline/plan.md`

## Phase 1: Legacy Freeze

- [x] T001 新增 legacy 归档冻结说明文档
- [x] T002 新增 `scripts/verify-legacy-freeze.sh`
- [x] T003 把 legacy 冻结校验接入 unified workspace init

## Phase 2: Shared Contract Updates

- [x] T004 让 `ui/server.mjs` 支持环境变量驱动的 runtime/ui/gateway 配置
- [x] T005 为 `install-local-feishu.sh` 增加 `prepare-only` 模式
- [x] T006 为共享安装脚本增加 `OPENCLAW_HOME` 与 `OPENCLAW_GATEWAY_BIND` 支持

## Phase 3: Docker Baseline Assets

- [x] T007 新增 `.dockerignore`
- [x] T008 新增 `deploy/docker/Dockerfile`
- [x] T009 新增 `deploy/docker/docker-compose.yml`
- [x] T010 新增 `deploy/docker/.env.example`
- [x] T011 新增 runtime / core / bootstrap 辅助脚本

## Phase 4: Docs & Longrun Sync

- [x] T012 新增 root F-007 runbook
- [x] T013 更新 unified workspace 的 app spec / feature list / progress
- [x] T014 更新 portable legacy workspace 的 F-007 handoff
- [x] T015 更新 `specs/006-opensparrow-root-unification/tasks.md` 的 next-phase 状态

## Phase 5: Validation

- [x] T016 运行 unified workspace init
- [x] T017 运行 shell / node 语法检查
- [x] T018 运行 compose config
- [x] T019 启动 core 容器并验证 `/api/status`

