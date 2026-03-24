# Docker SOP

## 适用范围

本文档面向 OpenSparrow Docker baseline 的运维与交接人员，适用于：

- 镜像定义：`deploy/docker/Dockerfile`
- 编排文件：`deploy/docker/docker-compose.yml`
- core 入口：`deploy/docker/bin/run-core.sh`
- bootstrap 入口：`deploy/docker/bin/bootstrap-profile.sh`

当前 baseline 的设计目标是：

- 用单个 `opensparrow-core` 容器承载 `ui/server.mjs` 与前台 gateway；
- 用一次性 `opensparrow-bootstrap` 容器写入 profile/config；
- 继续保留原生 Mac / Windows 交付链，不在容器层强行统一 wrapper 语法。

## 1. 前置条件

| 项目 | 要求 | 验证方式 |
|---|---|---|
| Docker 版本 | 建议使用支持 `docker compose` 子命令的 Docker Desktop / Docker Engine，Compose v2 可用 | `docker compose version` |
| 可用磁盘 | 建议至少预留 `5 GB` 可用空间；仅 `vendor/linux-openclaw` 当前上下文已约 `891 MB`，还需预留镜像层、volume、日志与证据空间 | `df -h`、`docker system df` |
| 网络要求（构建） | 构建镜像时宿主机需能访问 Debian 软件源以安装 `bash`、`curl`、`tini` 等依赖 | `docker pull debian:bookworm-slim`、`docker build` |
| 网络要求（运行） | 若要完成 bootstrap / probe / smoke，容器需能访问 `OPENAI_BASE_URL`（或默认 OpenAI 兼容接口）以及飞书开放平台 | 容器内 `curl` / 实际 bootstrap |
| 端口可用 | 宿主机默认暴露 `19000`（UI）和 `18889`（gateway） | `lsof -i :19000 -i :18889` 或等价命令 |
| 资源建议 | 建议至少 `2 vCPU / 4 GB RAM`，避免首次 build 与 gateway 启动阶段过慢 | `docker info` |

额外说明：

- 当前 Docker baseline 基于 Linux runtime，使用 `vendor/linux-openclaw` 作为只读上游资产。
- 当前 compose 为单实例基线，不提供严格零停机升级；升级章节提供的是单实例“快速重建切换”流程。

## 2. 快速开始

### 2.1 渲染并检查 compose

```bash
docker compose -f deploy/docker/docker-compose.yml config
```

期望结果：compose 成功渲染，无语法错误。

### 2.2 构建并启动 core 服务

```bash
docker compose -f deploy/docker/docker-compose.yml up -d --build opensparrow-core
```

检查容器状态：

```bash
docker compose -f deploy/docker/docker-compose.yml ps
```

### 2.3 初始化 profile（首次部署必做）

先准备环境文件：

```bash
cp deploy/docker/.env.example deploy/docker/.env
```

至少填写以下变量：

- `FEISHU_APP_ID`
- `FEISHU_APP_SECRET`
- `OPENAI_API_KEY`

执行一次性 bootstrap：

```bash
docker compose \
  --env-file deploy/docker/.env \
  -f deploy/docker/docker-compose.yml \
  run --rm opensparrow-bootstrap
```

说明：

- `opensparrow-bootstrap` 复用 `scripts/openclaw-usb/install-local-feishu.sh` 的共享配置逻辑；
- 它使用 `prepare-only` 模式写入容器 profile，不会尝试做宿主机 daemon install。

### 2.4 验证健康状态

```bash
curl http://127.0.0.1:19000/api/status
```

最低通过标准：

- HTTP `200`
- 返回 JSON
- 首次 bootstrap 完成后，`configExists=true`
- gateway 已工作时，`gatewayHealthy=true`
- 当前容器基线通常表现为 `runtimeMode="gateway-fallback"`

## 3. 配置说明

### 3.1 环境变量

下表按 `deploy/docker/docker-compose.yml` 与 `deploy/docker/.env.example` 整理：

| 变量 | 默认值 | 用途 | 是否必填 |
|---|---|---|---|
| `OPENCLAW_PROFILE` | `container-baseline` | 容器内 profile 名称；决定 `~/.openclaw-<profile>/` 路径 | 否 |
| `OPENCLAW_HOME` | `/var/opensparrow/home` | 容器内 HOME 与 profile 持久化根目录 | 否 |
| `OPENCLAW_GATEWAY_PORT` | `18889` | gateway 监听端口，同时映射到宿主机 | 否 |
| `OPENCLAW_GATEWAY_BIND` | `lan` | gateway 绑定模式，传给 `gateway run` | 否 |
| `OPENSPARROW_UI_PORT` | `19000` | UI 服务监听端口，同时映射到宿主机 | 否 |
| `OPENCLAW_AGENT_ID` | `main` | bootstrap 时默认 agent 标识 | 否 |
| `OPENCLAW_MODEL` | `openai/gpt-4o-mini` | bootstrap 时默认模型 | 否 |
| `OPENAI_BASE_URL` | 空 | OpenAI-compatible 基础地址；留空时使用上游默认行为 | 视环境而定 |
| `OPENAI_API_KEY` | 空 | 模型提供方 API Key | 是（bootstrap 时） |
| `FEISHU_DOMAIN` | `feishu` | 飞书域配置，传递给共享安装逻辑 | 否 |
| `FEISHU_APP_ID` | 空 | 飞书应用 App ID | 是（bootstrap 时） |
| `FEISHU_APP_SECRET` | 空 | 飞书应用 App Secret | 是（bootstrap 时） |
| `USB_RUNTIME_ROOT` | `/opt/opensparrow/runtime` | 容器运行时映射根目录，由 `prepare-runtime.sh` 建立软链接 | compose 内固定 |
| `LOG_DIR` | `/var/opensparrow/logs` | 日志目录 | compose 内固定 |
| `EVIDENCE_ROOT` | `/var/opensparrow/evidence` | 证据/导出目录 | compose 内固定 |
| `OPENSPARROW_AUTO_OPEN` | `0` | 禁止容器尝试自动打开浏览器 | compose 内固定 |

关键约束：

- `opensparrow-core` 与 `opensparrow-bootstrap` 共享同一组 volume，因此 bootstrap 写入的 profile 会被 core 立即复用。
- `bootstrap-profile.sh` 会显式检查 `FEISHU_APP_ID`、`FEISHU_APP_SECRET`、`OPENAI_API_KEY`；缺任一变量都会直接失败。

### 3.2 数据卷挂载

当前 compose 使用 3 个命名卷：

| 卷名 | 容器路径 | 内容 |
|---|---|---|
| `opensparrow-home` | `/var/opensparrow/home` | profile 数据、`openclaw.json`、`auth-profiles.json`、workspace 状态 |
| `opensparrow-logs` | `/var/opensparrow/logs` | 运行日志 |
| `opensparrow-evidence` | `/var/opensparrow/evidence` | bootstrap 证据、后续 probe/smoke 证据 |

其中最关键的是 `opensparrow-home`，因为：

- `OPENCLAW_HOME=/var/opensparrow/home`
- profile 默认写入 `/var/opensparrow/home/.openclaw-container-baseline/`
- `run-core.sh` 会等待 `openclaw.json` 出现后再拉起 gateway

### 3.3 端口映射

| 宿主机端口 | 容器端口 | 用途 |
|---|---|---|
| `${OPENSPARROW_UI_PORT}` | `${OPENSPARROW_UI_PORT}` | UI / `/api/status` |
| `${OPENCLAW_GATEWAY_PORT}` | `${OPENCLAW_GATEWAY_PORT}` | gateway |

如果宿主机已有端口占用，可在 `.env` 或命令行环境里改写 `OPENSPARROW_UI_PORT` / `OPENCLAW_GATEWAY_PORT`，然后重新 `up -d`。

## 4. 日常运维

### 4.1 启动 / 停止 / 重启

启动或确保 core 常驻：

```bash
docker compose -f deploy/docker/docker-compose.yml up -d opensparrow-core
```

停止服务：

```bash
docker compose -f deploy/docker/docker-compose.yml stop opensparrow-core
```

重启服务：

```bash
docker compose -f deploy/docker/docker-compose.yml restart opensparrow-core
```

停止并移除容器（保留 named volumes）：

```bash
docker compose -f deploy/docker/docker-compose.yml down
```

### 4.2 查看日志

实时跟日志：

```bash
docker compose -f deploy/docker/docker-compose.yml logs -f opensparrow-core
```

看最近 200 行：

```bash
docker compose -f deploy/docker/docker-compose.yml logs --tail=200 opensparrow-core
```

bootstrap 日志：

```bash
docker compose \
  --env-file deploy/docker/.env \
  -f deploy/docker/docker-compose.yml \
  run --rm opensparrow-bootstrap
```

### 4.3 进入容器

```bash
docker compose -f deploy/docker/docker-compose.yml exec opensparrow-core bash
```

常用容器内检查命令：

```bash
openclaw --profile container-baseline config validate --json
openclaw --profile container-baseline channels status --probe --json
ls -la /var/opensparrow/home/.openclaw-container-baseline
```

## 5. 健康检查

### 5.1 Compose 健康检查

`deploy/docker/docker-compose.yml` 已配置健康检查：

```text
curl -fsS http://127.0.0.1:${OPENSPARROW_UI_PORT}/api/status >/dev/null
```

查看健康状态：

```bash
docker compose -f deploy/docker/docker-compose.yml ps
docker inspect --format '{{json .State.Health}}' opensparrow-core 2>/dev/null
```

### 5.2 `/api/status` 端点

请求命令：

```bash
curl http://127.0.0.1:19000/api/status
```

当前接口会返回以下关键字段：

- `installed`
- `daemon`
- `runtimeMode`
- `configExists`
- `profileDirExists`
- `gatewayHealthy`
- `gatewayPortBusy`
- `profile`
- `configPath`

#### 预期返回：首次启动、未 bootstrap

```json
{
  "installed": false,
  "runtimeMode": "stopped",
  "configExists": false,
  "profileDirExists": false,
  "gatewayHealthy": false
}
```

#### 预期返回：bootstrap 完成、core 正常工作

```json
{
  "installed": false,
  "runtimeMode": "gateway-fallback",
  "configExists": true,
  "profileDirExists": true,
  "gatewayHealthy": true,
  "gatewayPortBusy": true,
  "profile": "container-baseline"
}
```

重要说明：

- 当前 Docker baseline 通过 `run-core.sh` 以前台方式托管 gateway，不依赖宿主机 service manager。
- 因此容器健康判断应优先看 `HTTP 200 + configExists=true + gatewayHealthy=true + runtimeMode=gateway-fallback`。
- `installed` 在当前容器基线里**不应被视为唯一成功信号**；它保留的是更偏 daemon/service 的语义。

## 6. 常见故障排查

### 6.1 `docker: 'compose' is not a docker command`

原因：Docker Compose v2 插件未安装或 Docker Desktop 未正确启用。

处理：

- 先执行 `docker compose version`
- 升级 Docker Desktop，或为 Docker Engine 安装 Compose v2 插件

### 6.2 构建阶段卡在 `apt-get update` / `apt-get install`

原因：宿主机无法访问 Debian 软件源，或需要代理。

处理：

- 检查宿主机 DNS / 代理设置
- 验证 `docker pull debian:bookworm-slim`
- 如企业网络有镜像源要求，按本地 Docker 代理规范配置后重试

### 6.3 `opensparrow-bootstrap` 直接报 `Missing required envs`

原因：`bootstrap-profile.sh` 要求以下变量非空：

- `FEISHU_APP_ID`
- `FEISHU_APP_SECRET`
- `OPENAI_API_KEY`

处理：

- 复制 `deploy/docker/.env.example` 到 `deploy/docker/.env`
- 填入真实值后重新执行 bootstrap

### 6.4 `/api/status` 返回 HTTP 200，但 `installed=false`

这在当前容器基线下**不一定是故障**。

请按以下顺序判断：

1. 若 `configExists=false`：说明 bootstrap 没有写入 profile，先重跑 `opensparrow-bootstrap`
2. 若 `configExists=true` 且 `gatewayHealthy=true` 且 `runtimeMode=gateway-fallback`：容器 baseline 正常
3. 若 `configExists=true` 但 `gatewayHealthy=false`：查看 core 日志，重点检查 gateway 是否反复退出

### 6.5 core 日志持续打印 `waiting for ... openclaw.json`

原因：`run-core.sh` 会等待 `${OPENCLAW_HOME}/.openclaw-${OPENCLAW_PROFILE}/openclaw.json` 出现后才拉起 gateway。

处理：

- 确认 bootstrap 是否成功执行
- 确认 `opensparrow-bootstrap` 与 `opensparrow-core` 使用的是同一组 named volumes
- 进入容器检查 `/var/opensparrow/home/.openclaw-container-baseline/openclaw.json`

### 6.6 端口冲突：`port is already allocated` / UI 无法访问

原因：宿主机 `19000` 或 `18889` 已被占用。

处理：

- 修改 `.env` 中的 `OPENSPARROW_UI_PORT` / `OPENCLAW_GATEWAY_PORT`
- 执行 `docker compose -f deploy/docker/docker-compose.yml up -d`
- 用新端口重新验证 `curl http://127.0.0.1:<ui-port>/api/status`

### 6.7 磁盘不足：`no space left on device`

原因：镜像层、日志或 volume 持续增长。

处理：

```bash
docker system df
docker image prune -f
docker container prune -f
```

若确认历史 volume 可清理，再谨慎执行：

```bash
docker volume ls
docker volume prune
```

## 7. 备份与恢复

### 7.1 需要备份什么

最低要求：备份 `opensparrow-home`，因为其中包含：

- `.openclaw-container-baseline/openclaw.json`
- `.openclaw-container-baseline/agents/.../auth-profiles.json`
- 相关 workspace / state 数据

建议同时备份：

- `opensparrow-logs`
- `opensparrow-evidence`

### 7.2 备份示例

先停服务，避免写入中的不一致：

```bash
docker compose -f deploy/docker/docker-compose.yml down
mkdir -p backups
```

备份 `opensparrow-home`：

```bash
docker run --rm \
  -v opensparrow-home:/from \
  -v "$PWD/backups":/backup \
  alpine sh -c 'cd /from && tar czf /backup/opensparrow-home-$(date +%Y%m%d-%H%M%S).tgz .'
```

按同样方式可备份日志与证据卷：

```bash
docker run --rm \
  -v opensparrow-logs:/from \
  -v "$PWD/backups":/backup \
  alpine sh -c 'cd /from && tar czf /backup/opensparrow-logs-$(date +%Y%m%d-%H%M%S).tgz .'

docker run --rm \
  -v opensparrow-evidence:/from \
  -v "$PWD/backups":/backup \
  alpine sh -c 'cd /from && tar czf /backup/opensparrow-evidence-$(date +%Y%m%d-%H%M%S).tgz .'
```

### 7.3 恢复示例

先确保服务已停止：

```bash
docker compose -f deploy/docker/docker-compose.yml down
```

如 volume 不存在可先创建：

```bash
docker volume create opensparrow-home
```

恢复 `opensparrow-home`：

```bash
docker run --rm \
  -v opensparrow-home:/to \
  -v "$PWD/backups":/backup \
  alpine sh -c 'rm -rf /to/* && cd /to && tar xzf /backup/opensparrow-home-YYYYMMDD-HHMMSS.tgz'
```

恢复完成后启动 core，并再次检查 `/api/status`。

## 8. 升级流程

### 8.1 升级前准备

- 记录当前版本对应的 git 提交或交付批次
- 先执行第 7 章的 volume 备份
- 确认新的仓库内容已同步到当前工作根

### 8.2 重新构建镜像

```bash
docker compose -f deploy/docker/docker-compose.yml build opensparrow-core
```

如需完全重拉基础层并排查缓存问题：

```bash
docker compose -f deploy/docker/docker-compose.yml build --no-cache opensparrow-core
```

### 8.3 单实例“滚动”重启

当前 compose 只有一个 `opensparrow-core` 实例，因此不提供严格意义的零停机 rolling update。

推荐的近似流程是：

```bash
docker compose -f deploy/docker/docker-compose.yml up -d --no-deps --build opensparrow-core
```

该命令会重建并快速替换单实例容器，通常足以满足 baseline 环境升级。

### 8.4 升级后验证

```bash
docker compose -f deploy/docker/docker-compose.yml ps
curl http://127.0.0.1:19000/api/status
```

如本次升级涉及模型、飞书凭据或 profile 结构变更，建议重新执行：

```bash
docker compose \
  --env-file deploy/docker/.env \
  -f deploy/docker/docker-compose.yml \
  run --rm opensparrow-bootstrap
```

### 8.5 回滚建议

- 优先恢复 `opensparrow-home` 备份
- 切回上一版仓库内容后重新 `build` 并 `up -d`
- 若只是配置错误，先恢复 volume 再验证 `/api/status`

## 相关文档

- `docs/runbooks/F-007-legacy-archive-docker-baseline.md`
- `docs/legacy-archive-freeze-20260323.md`
- `deploy/docker/README.md`
- `deploy/docker/.env.example`
