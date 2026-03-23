# Tasks: OpenSparrow Root Unification Execution

**Input**: `specs/006-opensparrow-root-unification/spec.md`, `specs/006-opensparrow-root-unification/plan.md`

## Phase 1: Context Merge

- [x] T001 迁入 `openclawNative` 的 `.codex/.specify/longrun/docs/scripts`
- [x] T002 迁入 `openclawNative` 的 `vendor/` 与平台 companion 真源
- [x] T003 迁入 `feishu-source` 的 `specs/longrun/scripts/skills/research`
- [x] T004 迁入 `usb-pack/ui/docs/runbooks` 与平台 wrapper 模板

## Phase 2: Root Rules

- [x] T005 新建根级 `AGENTS.md`
- [x] T006 新建根级 `.gitattributes`
- [x] T007 新建根级 `.gitignore`
- [x] T008 合并并重写根级 `constitution.md`
- [x] T009 重写 `docs/项目持久化说明.md`

## Phase 3: New Planning Artifacts

- [x] T010 新建根级对外方案文档
- [x] T011 新建 `specs/006-opensparrow-root-unification/spec.md`
- [x] T012 新建 `specs/006-opensparrow-root-unification/plan.md`
- [x] T013 新建 `specs/006-opensparrow-root-unification/tasks.md`

## Phase 4: Longrun Adaptation

- [x] T014 新建 `opensparrow-unified` workspace
- [x] T015 适配 `openclaw-native` workspace 到新路径结构
- [x] T016 更新 `openclaw-usb-portable` workspace 的根路径说明与迁移记录

## Phase 5: Bootstrap and Validation

- [x] T017 初始化根级 git 仓库
- [x] T018 修正 wrapper 在 source tree 下的 fallback 路径
- [x] T019 运行 unified 与 legacy workspace init
- [x] T020 运行 shell 语法检查并记录结果

## Phase 6: Next Phase Queue

- [x] T021 冻结并计划归档 legacy 目录
- [x] T022 进入 `deploy/docker/` 容器化基线实现
