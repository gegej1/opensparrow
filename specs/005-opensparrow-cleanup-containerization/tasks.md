# Tasks: OpenSparrow Repo Cleanup, Cross-Platform Balance & Containerized Baseline

**Input**: `specs/005-opensparrow-cleanup-containerization/spec.md`, `specs/005-opensparrow-cleanup-containerization/plan.md`  
**Prerequisites**: `spec.md`, `plan.md`

## Phase 1: Inventory & Boundary Freeze (P1)

- [ ] T001 冻结当前重复目录清单：`opensparrow_win/`、`_push_opensparrow_win/`、`openclaw-usb-feishu-delivery/mac`、`openclaw-usb-feishu-delivery/winnew/winnew`、`usb-pack/`、`execution/export/*`
- [ ] T002 标记每类资产的“真源 / 生成物 / 历史副本”身份
- [ ] T003 输出迁移地图：哪些目录未来保留、哪些目录只允许生成、哪些目录待下线

## Phase 2: Mac / Windows Balance Design (P1)

- [ ] T004 对比 Mac 与 Windows 副本中真正共享的层（spec/longrun/scripts/UI/runtime config）
- [ ] T005 对比 Mac 与 Windows 必须保留的平台差异层（wrapper/runtime packaging/交互入口）
- [ ] T006 形成“共享层 / 平台差异层 / 历史副本层”三层划分图

## Phase 3: Repository Strategy Decision (P1)

- [ ] T007 给出统一真源仓的推荐结构（不分 Mac/Windows 源码仓）
- [ ] T008 评估“当前目标仓库承接”与“新建中性真源仓承接”两条路径的利弊
- [ ] T009 明确发布仓 / 交付仓是否需要保留为独立目录或独立仓库

## Phase 4: Source Consolidation Design (P1)

- [ ] T010 识别当前仍在 hand-edit 的 generated 文件，并规划迁回真源位置
- [ ] T011 规划 `usb-pack`、push copy、delivery copy 的统一 build/export 入口
- [ ] T012 规划 `.gitignore` / release-ignore / 导出边界，避免未来再次把生成物混回源码面

## Phase 5: Container Baseline Design (P1)

- [ ] T013 设计容器目录结构（建议 `deploy/docker/`）
- [ ] T014 设计 `Dockerfile`、`docker-compose.yml`、`.env.example` 的职责边界
- [ ] T015 规划容器内运行模式：前台进程 / restart policy / volume profile，而不是宿主 daemon install
- [ ] T016 规划端口、卷、日志、workspace、ui-meta 的容器化隔离策略

## Phase 6: Compatibility & Wrapper Strategy (P1)

- [ ] T017 建立 container-ready / host-adapter / out-of-scope 能力矩阵
- [ ] T018 规划 Mac / Windows 原生入口如何收敛成薄 wrapper，而不是继续承载业务逻辑
- [ ] T019 规划 USB / handoff / push 副本如何从真源生成并保留交付体验

## Phase 7: Validation Design (P1)

- [ ] T020 设计 Mac Docker Desktop 验证清单（compose / health / probe / smoke）
- [ ] T021 设计 Windows Docker Desktop 验证清单（compose / health / probe / smoke）
- [ ] T022 设计 Feishu / WeCom / DingTalk 三条链路的容器化验证证据要求
- [ ] T023 设计原生交付回归清单，确保容器化不会破坏现有 handoff 路径

## Phase 8: Longrun Deliverables (P1)

- [ ] T024 更新 `longrun/workspaces/openclaw-usb-portable/feature_list.json` 的 F-007 验收标准
- [ ] T025 更新 `execution/docs/opensparrow-cleanup-containerization-plan-20260322.md`
- [ ] T026 新增 `execution/docs/repo-topology-recommendation-20260323.md`
- [ ] T027 更新 `execution/runbooks/F-007-repo-cleanup-containerization.md`
- [ ] T028 在 `claude-progress.txt` 追加本次规划 refinement 与后续实施入口

## Validation Checklist

- [ ] V001 已形成真源 / 生成物 / 历史副本的边界清单
- [ ] V002 已形成 Mac / Windows 共享层与平台差异层划分
- [ ] V003 已形成单一真源仓推荐与仓库承接策略
- [ ] V004 已形成容器目录与运行模式设计
- [ ] V005 已形成能力兼容矩阵
- [ ] V006 已形成 Mac / Windows 的 compose 验证清单
- [ ] V007 已形成 Feishu / WeCom / DingTalk 的容器化验证口径
- [ ] V008 已形成 native delivery 的保留策略
- [ ] V009 longrun 文档、runbook、feature item 已同步
