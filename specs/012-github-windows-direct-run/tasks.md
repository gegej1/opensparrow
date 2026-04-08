# Tasks: GitHub Windows Direct-Run Runtime Closure

**Input**: `specs/012-github-windows-direct-run/spec.md`, `specs/012-github-windows-direct-run/plan.md`

## Phase 1: Scope & Boundaries

- [x] T001 明确 GitHub 直跑目标只覆盖 Windows runtime，不包含本机 Skill 大包
- [x] T002 审查 `one-click-deploy` / `run-openclaw-usb` 的 repo-root runtime 前提

## Phase 2: Runtime & Entrypoints

- [x] T003 调整 `.gitignore`，仅放行 `vendor/windows-openclaw/`
- [x] T004 新增根级 `one-click-deploy.cmd` 转发入口
- [x] T005 让 `install-local-feishu.ps1` 同时兼容 `runtime/` 与 `vendor/windows-openclaw/`
- [x] T006 将 `vendor/windows-openclaw/` 加入 Git 跟踪

## Phase 3: Docs & Handoff

- [x] T007 更新 Windows delivery / 安装说明
- [x] T008 更新 unified feature list 与 progress handoff

## Phase 4: Validation & Release

- [x] T009 校验 ignore / tracked 边界
- [x] T010 运行 unified workspace init 并整理可推送结果
