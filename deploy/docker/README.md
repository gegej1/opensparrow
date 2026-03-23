# Docker Baseline

本目录承载 F-007 的最小可运行容器基线。

## 文件说明

- `Dockerfile`：构建 Linux baseline 镜像，只复制容器所需真源资产
- `docker-compose.yml`：定义 `opensparrow-core` 与一次性 `opensparrow-bootstrap`
- `.env.example`：容器 profile 与 API/渠道变量模板
- `bin/prepare-runtime.sh`：把 `vendor/linux-openclaw` 映射到 `USB_RUNTIME_ROOT`
- `bin/run-core.sh`：以前台 supervisor 方式同时托管 UI 与 gateway
- `bin/bootstrap-profile.sh`：复用共享安装脚本，以 `prepare-only` 模式写入容器 profile

## 快速开始

```bash
docker compose -f deploy/docker/docker-compose.yml config
docker compose -f deploy/docker/docker-compose.yml up -d --build opensparrow-core
cp deploy/docker/.env.example deploy/docker/.env
docker compose --env-file deploy/docker/.env -f deploy/docker/docker-compose.yml run --rm opensparrow-bootstrap
curl http://127.0.0.1:19000/api/status
```

更完整的验证链见：`docs/runbooks/F-007-legacy-archive-docker-baseline.md`
