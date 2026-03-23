# Implementation Plan: Legacy Archive Freeze & Docker Baseline

**Branch**: `007-legacy-archive-docker-baseline` | **Date**: 2026-03-23 | **Spec**: `specs/007-legacy-archive-docker-baseline/spec.md`

## Summary

本次实现不再停留在“F-007 已规划”的状态，而是把它推进到第一轮可执行成果：

1. 把 frozen legacy 目录升级为可校验的 logical archive；
2. 在 `deploy/docker/` 落下一个最小可运行的 container baseline；
3. 通过共享安装脚本的 `prepare-only` 模式复用现有配置逻辑；
4. 明确保留 native wrapper 与后续 build/export 的双轨结构。

## Technical Context

- **Repository root**: `/Users/eduardogan/Desktop/GHJProject/opensparrow`
- **Runtime source for Docker**: `vendor/linux-openclaw/`
- **Shared config logic**: `scripts/openclaw-usb/install-local-feishu.sh`
- **UI control plane**: `ui/server.mjs`
- **Primary docs**: `docs/legacy-archive-freeze-20260323.md`, `docs/runbooks/F-007-legacy-archive-docker-baseline.md`

## Design

### A. Legacy archive freeze

- 用文档明确 frozen 目录身份、允许动作、canonical 去向；
- 用 `scripts/verify-legacy-freeze.sh` 固化验证；
- 把该验证接入 `longrun/workspaces/opensparrow-unified/init.sh`。

### B. Container baseline

- 镜像只复制必要资产：`vendor/linux-openclaw/`、`scripts/openclaw-usb/`、`ui/`、`deploy/docker/`；
- 通过 `prepare-runtime.sh` 把 `vendor/linux-openclaw` 映射成 `USB_RUNTIME_ROOT` 可识别的布局；
- 通过 `run-core.sh` 以前台 supervisor 方式同时管理 UI 与 gateway；
- 通过 `bootstrap-profile.sh` 调用共享安装脚本的 `prepare-only` 模式写入容器 profile。

### C. Shared contract changes

- `ui/server.mjs` 新增环境变量驱动的 runtime/ui/gateway 端口读取；
- `install-local-feishu.sh` 新增 `prepare-only` 模式、`OPENCLAW_GATEWAY_BIND` 与 `OPENCLAW_HOME` 支持；
- 这些修改保持 native 路径兼容，容器只是新增能力，不替换现有入口。

## Validation Plan

1. `./longrun/workspaces/opensparrow-unified/init.sh`
2. `bash scripts/verify-legacy-freeze.sh`
3. `bash -n deploy/docker/bin/*.sh`
4. `node --check ui/server.mjs`
5. `docker compose -f deploy/docker/docker-compose.yml config`
6. `docker compose -f deploy/docker/docker-compose.yml up -d --build opensparrow-core`
7. `curl http://127.0.0.1:19000/api/status`

## Deferred

- build/export 全收口
- native wrapper 更薄化
- frozen 目录的物理压缩与移出工作根

