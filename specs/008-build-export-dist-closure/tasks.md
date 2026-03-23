# Tasks: Build / Export Dist Closure

**Input**: `specs/008-build-export-dist-closure/spec.md`, `specs/008-build-export-dist-closure/plan.md`

## Phase 1: Canonical Packaging Sources

- [x] T001 审查 build/export 脚本中的旧输出路径与不存在模板路径
- [x] T002 为 Windows 包内桥接入口补 canonical `platforms/windows/wrappers/*.ps1`
- [x] T003 让 `build-delivery-pack.sh` 从根级 canonical docs / runbooks / wrappers / scripts 组包

## Phase 2: Dist / Vendor 收口

- [x] T004 把 staging 包输出切到 `dist/usb-pack/`
- [x] T005 把 Mac / Windows handoff copy 输出切到 `dist/handoff/`
- [x] T006 把 bundled runtime 来源切到 `vendor/`
- [x] T007 更新 feature snapshot 与版本文件来源说明

## Phase 3: Docs & Handoff Sync

- [x] T008 新增 `specs/008-build-export-dist-closure/`
- [x] T009 更新受影响的 USB pack / Windows delivery / F-003 runbook 文档
- [x] T010 更新 unified / portable feature list 与 progress handoff

## Phase 4: Validation

- [x] T011 运行 `bash -n` 校验 build/export shell 脚本
- [x] T012 执行 staging 包 build 并检查 `dist/usb-pack/` 产物结构
- [x] T013 运行 unified / portable workspace init
