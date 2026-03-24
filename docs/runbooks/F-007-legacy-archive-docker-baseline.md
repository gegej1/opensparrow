# F-007 Runbook - Legacy 归档冻结与 Docker Baseline

## 元数据
- 日期：`2026-03-23`
- 作者/Agent：`Codex-B`
- 关联 spec：`specs/007-legacy-archive-docker-baseline/spec.md`

## 概述
- 在统一真源仓已经稳定后，完成两件事：把 legacy 目录从“口头冻结”升级为可校验的逻辑归档，并在 `deploy/docker/` 落下最小可运行的容器基线。
- 本文同时保留 native delivery 路径作为兼容契约。

## 前置条件
- 当前工作根是 `/Users/eduardogan/Desktop/GHJProject/opensparrow`。
- 已先跑过 `./longrun/workspaces/opensparrow-unified/init.sh`。
- Docker Desktop 可用（Mac / Windows / Linux 任一宿主均可）。
- 如需真实 probe / smoke，需准备：`FEISHU_APP_ID`、`FEISHU_APP_SECRET`、`OPENAI_API_KEY`。

## 操作步骤
1. 校验 legacy 冻结

   ```bash
   bash scripts/verify-legacy-freeze.sh
   ```

   - 期望结果：输出 4 个 frozen 目录，且没有 missing 错误。

2. 渲染 compose

   ```bash
   docker compose -f deploy/docker/docker-compose.yml config
   ```

   - 期望结果：compose 渲染成功。

3. 启动 core 容器

   ```bash
   docker compose -f deploy/docker/docker-compose.yml up -d --build opensparrow-core
   ```

   - 该服务会：
     - 启动 `ui/server.mjs`
     - 预热 Linux runtime 映射
     - 等待 `container-baseline` profile 配置出现后，以前台方式拉起 gateway

4. 写入容器 profile（一次性 bootstrap）

   ```bash
   cp deploy/docker/.env.example deploy/docker/.env
   docker compose \
     --env-file deploy/docker/.env \
     -f deploy/docker/docker-compose.yml \
     run --rm opensparrow-bootstrap
   ```

   - 该步骤复用 `scripts/openclaw-usb/install-local-feishu.sh` 的共享配置逻辑，但使用 `prepare-only` 模式，不在容器里做 host-style daemon install。

5. 检查 UI 状态

   ```bash
   curl http://127.0.0.1:19000/api/status
   ```

   - 期望结果：
     - HTTP 200
     - bootstrap 完成并且 gateway 已拉起后，返回里可见 `installed: true`
     - `runtimeMode` 预期为 `gateway-fallback`

6. 运行 CLI 验证

   ```bash
   docker compose -f deploy/docker/docker-compose.yml exec opensparrow-core \
     openclaw --profile container-baseline config validate --json

   docker compose -f deploy/docker/docker-compose.yml exec opensparrow-core \
     openclaw --profile container-baseline channels status --probe --json

   docker compose -f deploy/docker/docker-compose.yml exec opensparrow-core \
     openclaw --profile container-baseline agent --agent main --message "请只回复OK" --json
   ```

   - 无真实密钥时，至少先执行 `config validate --json`。
   - 有真实密钥时，再继续做 `channels status --probe` 与 `agent` smoke。

7. 停止容器

   ```bash
   docker compose -f deploy/docker/docker-compose.yml down
   ```

   - 停止容器后，继续保留以下 native 路径作为兼容契约：
     - macOS 仍保留 `.command + Bash`
     - Windows 仍保留 `.cmd/.ps1`
     - USB / handoff / push copy 仍保留为后续 build/export 产物

## 验证方法
- `bash scripts/verify-legacy-freeze.sh` 可稳定输出 4 个 frozen 目录。
- `docker compose -f deploy/docker/docker-compose.yml config` 渲染成功。
- `curl http://127.0.0.1:19000/api/status` 返回 HTTP 200，bootstrap 完成后可见 `installed: true`，`runtimeMode` 预期为 `gateway-fallback`。
- 容器基线统一的是：
  - Linux runtime 契约
  - 环境变量契约
  - compose / status / validate / probe / smoke 口径
  - 逻辑归档与验证链

## 故障排查
- Docker Desktop 不可用：先解决本机 Docker daemon 问题，再执行 compose 渲染和容器启动。
- bootstrap 后 `installed` 仍不是 `true`：优先检查 `deploy/docker/.env`、bootstrap 日志，以及 `container-baseline` profile 是否成功写入。
- `channels status --probe` 或 `agent` smoke 失败：优先确认是否已提供真实的 Feishu/OpenAI 凭据，再检查网络连通性。

## 参考资料
- `specs/007-legacy-archive-docker-baseline/spec.md`
- `docs/legacy-archive-freeze-20260323.md`
- `deploy/docker/Dockerfile`
- `deploy/docker/docker-compose.yml`
