# F-007 Runbook - OpenSparrow 仓库清理、平台平衡与容器化部署基线

> 2026-03-23 更新：规划产物已在根级 `opensparrow/` 真源仓进入第一轮执行。当前以根级 runbook 为准：`docs/runbooks/F-007-legacy-archive-docker-baseline.md`

## 目标

为 OpenSparrow 建立下一阶段实施入口，完成四件事：

- 收敛源码真源与生成产物边界；
- 重新平衡 Mac / Windows 历史副本；
- 设计并落地容器化运行基线，降低 Mac / Windows 主机差异；
- 明确统一源码仓策略，避免后续再次分裂成多套真源。

## 前置条件

- `specs/005-opensparrow-cleanup-containerization/` 已完成评审。
- 当前仓库中的 generated 目录暂不直接删除，先按迁移图分批处理。
- 执行环境具备 Docker / Docker Compose（Mac / Windows Docker Desktop）。
- Feishu / WeCom / DingTalk / OpenAI 参数有一套可复验样本。

## Phase A - 边界冻结

1. 盘点重复目录：
   - `opensparrow_win/`
   - `_push_opensparrow_win/`
   - `openclaw-usb-feishu-delivery/mac`
   - `openclaw-usb-feishu-delivery/winnew/winnew`
   - `usb-pack/`
   - `execution/export/*`
2. 标记每个目录的身份：真源 / generated / historical copy。
3. 输出迁移地图并冻结“后续只允许从真源生成”的规则。

## Phase B - 仓库策略决策

1. 评估“当前目标仓库承接”与“新建中性真源仓承接”两条路线。
2. 明确结论：
   - 不再长期分裂 Mac / Windows 源码仓；
   - 如需分开，只分 release / delivery，不分 source-of-truth。
3. 确认未来统一结构至少包含：
   - 共享层
   - `platforms/mac`
   - `platforms/windows`
   - `deploy/docker`

## Phase C - 容器基线实施（当前命令）

```bash
docker compose -f deploy/docker/docker-compose.yml config
docker compose -f deploy/docker/docker-compose.yml up -d --build opensparrow-core
docker compose --env-file deploy/docker/.env -f deploy/docker/docker-compose.yml run --rm opensparrow-bootstrap
curl http://127.0.0.1:19000/api/status
```

容器内目标验证命令：

```bash
docker compose -f deploy/docker/docker-compose.yml exec opensparrow-core openclaw --profile container-baseline config validate --json
docker compose -f deploy/docker/docker-compose.yml exec opensparrow-core openclaw --profile container-baseline channels status --probe
docker compose -f deploy/docker/docker-compose.yml exec opensparrow-core openclaw --profile container-baseline agent --agent main --message "请只回复OK" --json
```

## Phase D - Native Wrapper Regression

1. 验证 Windows / Mac 双击入口仍然存在。
2. 验证 USB / handoff 产物仍可通过 build/export 生成。
3. 确认 wrapper 不再承载核心业务逻辑，仅负责调用 compose 或生成产物。

## 通过标准

- 真源边界、生成物边界与迁移顺序明确。
- Mac / Windows 历史副本的角色明确。
- 已形成“单一真源仓 + 平台 wrapper + 发布产物”的仓库策略。
- 容器基线的目录、镜像、compose、卷、端口、env 契约明确。
- 已形成 Mac / Windows Docker 回归清单。
- 原生交付能力仍被保留，并被重新定义为构建产物链。

## 证据归档清单

- `execution/docs/opensparrow-cleanup-containerization-plan-20260322.md`
- `execution/docs/repo-topology-recommendation-20260323.md`
- `specs/005-opensparrow-cleanup-containerization/spec.md`
- `specs/005-opensparrow-cleanup-containerization/plan.md`
- `specs/005-opensparrow-cleanup-containerization/tasks.md`
- `execution/evidence/f007-*/repo-boundary-map.md`
- `execution/evidence/f007-*/repo-strategy-decision.md`
- 根级 `docs/legacy-archive-freeze-20260323.md`
- 根级 `scripts/verify-legacy-freeze.sh`
- 根级 `deploy/docker/Dockerfile`
- 根级 `deploy/docker/docker-compose.yml`
- 根级 `docs/runbooks/F-007-legacy-archive-docker-baseline.md`
- `execution/evidence/f007-*/health.json`
- `execution/evidence/f007-*/channels-probe.json`
- `execution/evidence/f007-*/native-wrapper-regression.md`
